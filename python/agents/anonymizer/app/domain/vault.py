# Créé par Cédric HOUPE.
# Usage ou reproduction à l'identique interdit sans autorisation.
"""Reversible, encrypted correspondence table (the "vault").

Storage: a single SQLite file with three tables.

- meta: one row (salt, kdf iterations, encrypted canary) used to derive the
  encryption key from a passphrase and to detect a wrong passphrase.
- counters: next free sequence number per entity type, used to build
  human-readable tokens like "[PERSONNE_3]".
- mappings: token -> encrypted original value, plus a `kind` ('text' or
  'bytes') so resolve()/resolve_bytes() never mix up which decode path a
  token belongs to.
- value_index: a keyed (HMAC) blind index of "entity_type + normalized
  value" (or, for a bytes value, "entity_type + sha256(value)") -> token,
  so the same real-world value always gets the same token again, without
  storing the plaintext value anywhere queryable.

The passphrase itself is never written to disk; only a PBKDF2 salt and an
encrypted canary are. Losing the passphrase means the vault is
unrecoverable by design.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

from cryptography.fernet import Fernet, InvalidToken
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

from app.domain.entities import EntityType

_KDF_ITERATIONS = 300_000
_CANARY_PLAINTEXT = b"anonymizer-vault-v1"


class WrongPassphraseError(Exception):
    """The passphrase does not match the vault's stored canary."""


class Vault:
    def __init__(self, path: str | Path, passphrase: str) -> None:
        self.path = Path(path)
        is_new = not self.path.exists()
        self._conn = sqlite3.connect(self.path)
        self._conn.execute("PRAGMA foreign_keys = ON")
        if is_new:
            self._init_schema()
            salt = os.urandom(16)
            self._store_meta(salt, _KDF_ITERATIONS)
            self._derive_keys(passphrase, salt, _KDF_ITERATIONS)
            canary = self._fernet.encrypt(_CANARY_PLAINTEXT)
            self._conn.execute(
                "UPDATE meta SET canary = ? WHERE id = 1", (canary,)
            )
            self._conn.commit()
        else:
            salt, iterations, canary = self._load_meta()
            self._derive_keys(passphrase, salt, iterations)
            try:
                decrypted = self._fernet.decrypt(canary)
            except InvalidToken as exc:
                raise WrongPassphraseError(
                    "Passphrase incorrecte pour ce vault."
                ) from exc
            if decrypted != _CANARY_PLAINTEXT:
                raise WrongPassphraseError("Passphrase incorrecte pour ce vault.")
            self._upgrade_schema()

    def _upgrade_schema(self) -> None:
        """A vault created before the `kind` column existed (image/binary
        support) is missing it - add it transparently so an older, already
        deployed vault file keeps working with no manual migration step."""
        columns = {row[1] for row in self._conn.execute("PRAGMA table_info(mappings)")}
        if "kind" not in columns:
            self._conn.execute(
                "ALTER TABLE mappings ADD COLUMN kind TEXT NOT NULL DEFAULT 'text'"
            )
            self._conn.commit()

    # -- setup -------------------------------------------------------
    def _init_schema(self) -> None:
        self._conn.executescript(
            """
            CREATE TABLE meta (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                salt BLOB NOT NULL,
                iterations INTEGER NOT NULL,
                canary BLOB
            );
            CREATE TABLE counters (
                entity_type TEXT PRIMARY KEY,
                next_value INTEGER NOT NULL
            );
            CREATE TABLE mappings (
                token TEXT PRIMARY KEY,
                entity_type TEXT NOT NULL,
                ciphertext BLOB NOT NULL,
                kind TEXT NOT NULL DEFAULT 'text',
                created_at TEXT NOT NULL
            );
            CREATE TABLE value_index (
                index_key TEXT PRIMARY KEY,
                token TEXT NOT NULL REFERENCES mappings(token)
            );
            """
        )

    def _store_meta(self, salt: bytes, iterations: int) -> None:
        self._conn.execute(
            "INSERT INTO meta (id, salt, iterations, canary) VALUES (1, ?, ?, NULL)",
            (salt, iterations),
        )

    def _load_meta(self) -> tuple[bytes, int, bytes]:
        row = self._conn.execute(
            "SELECT salt, iterations, canary FROM meta WHERE id = 1"
        ).fetchone()
        if row is None:
            raise ValueError(f"Vault invalide (table meta vide) : {self.path}")
        return row[0], row[1], row[2]

    def _derive_keys(self, passphrase: str, salt: bytes, iterations: int) -> None:
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=iterations,
        )
        master_key = kdf.derive(passphrase.encode("utf-8"))
        encrypt_key = hashlib.sha256(master_key + b"encrypt").digest()
        self._fernet = Fernet(base64.urlsafe_b64encode(encrypt_key))
        self._index_key = hashlib.sha256(master_key + b"index").digest()

    # -- token <-> value -----------------------------------------------
    def _blind_index(self, entity_type: EntityType, normalized_value: str) -> str:
        # casefold() plutot que lower() : gere correctement les cas ou
        # lower()/upper() divergent selon la langue/l'unicode (ex. le "ß"
        # allemand). Volontairement insensible a la casse : "Lara" et
        # "lara" doivent obtenir le meme jeton. Contrepartie assumee : la
        # ciphertext stockee est celle de la PREMIERE occurrence vue -
        # resolve() restituera toujours cette casse-la pour ce jeton,
        # meme pour une occurrence qui avait a l'origine une casse
        # differente (voir tokenize()).
        message = f"{entity_type.value}\x00{normalized_value.casefold()}".encode("utf-8")
        return hmac.new(self._index_key, message, hashlib.sha256).hexdigest()

    def _blind_index_bytes(self, entity_type: EntityType, data: bytes) -> str:
        # Hash first so the HMAC message stays a small, fixed size instead
        # of feeding it a multi-MB image directly.
        digest = hashlib.sha256(data).digest()
        message = entity_type.value.encode("utf-8") + b"\x00" + digest
        return hmac.new(self._index_key, message, hashlib.sha256).hexdigest()

    def _next_counter(self, entity_type: EntityType) -> int:
        cur = self._conn.execute(
            "SELECT next_value FROM counters WHERE entity_type = ?",
            (entity_type.value,),
        ).fetchone()
        if cur is None:
            self._conn.execute(
                "INSERT INTO counters (entity_type, next_value) VALUES (?, 2)",
                (entity_type.value,),
            )
            return 1
        next_value = cur[0]
        self._conn.execute(
            "UPDATE counters SET next_value = ? WHERE entity_type = ?",
            (next_value + 1, entity_type.value),
        )
        return next_value

    def _get_or_create_token(
        self, entity_type: EntityType, index_key: str, plaintext: bytes, kind: str
    ) -> str:
        row = self._conn.execute(
            "SELECT token FROM value_index WHERE index_key = ?", (index_key,)
        ).fetchone()
        if row is not None:
            return row[0]

        counter = self._next_counter(entity_type)
        token = f"[{entity_type.value}_{counter}]"
        ciphertext = self._fernet.encrypt(plaintext)
        now = datetime.now(timezone.utc).isoformat()
        self._conn.execute(
            "INSERT INTO mappings (token, entity_type, ciphertext, kind, created_at) "
            "VALUES (?, ?, ?, ?, ?)",
            (token, entity_type.value, ciphertext, kind, now),
        )
        self._conn.execute(
            "INSERT INTO value_index (index_key, token) VALUES (?, ?)",
            (index_key, token),
        )
        self._conn.commit()
        return token

    def tokenize(self, entity_type: EntityType, value: str) -> str:
        """Return the token for `value`, creating one if unseen. The same
        (entity_type, value) pair always yields the same token, even
        across separate anonymize() calls against this vault - matched
        case-insensitively ("Lara" and "lara" share a token). The value
        actually stored (and later returned by resolve()) is whichever
        casing was tokenized first for that pair; a later call with a
        different casing still gets the same token, but resolve() won't
        reproduce that later call's exact casing - deliberately preferring
        one consistent, readable token per real-world value over an exact
        per-occurrence round trip."""
        normalized = value.strip()
        index_key = self._blind_index(entity_type, normalized)
        return self._get_or_create_token(
            entity_type, index_key, normalized.encode("utf-8"), "text"
        )

    def tokenize_bytes(self, entity_type: EntityType, data: bytes) -> str:
        """Same as `tokenize`, for a binary value (e.g. a whole image
        that's being swapped out for a placeholder) instead of a string -
        used to make that swap reversible via `resolve_bytes`."""
        index_key = self._blind_index_bytes(entity_type, data)
        return self._get_or_create_token(entity_type, index_key, data, "bytes")

    def resolve(self, token: str) -> str | None:
        """Return the original text value for `token`, or None if this
        vault has never seen that token (or it was stored via
        `tokenize_bytes`, not `tokenize`)."""
        row = self._conn.execute(
            "SELECT ciphertext, kind FROM mappings WHERE token = ?", (token,)
        ).fetchone()
        if row is None or row[1] != "text":
            return None
        return self._fernet.decrypt(row[0]).decode("utf-8")

    def resolve_bytes(self, token: str) -> bytes | None:
        """Return the original binary value for `token`, or None if this
        vault has never seen that token (or it was stored via `tokenize`,
        not `tokenize_bytes`)."""
        row = self._conn.execute(
            "SELECT ciphertext, kind FROM mappings WHERE token = ?", (token,)
        ).fetchone()
        if row is None or row[1] != "bytes":
            return None
        return self._fernet.decrypt(row[0])

    def close(self) -> None:
        self._conn.close()

    def __enter__(self) -> "Vault":
        return self

    def __exit__(self, *exc_info) -> None:
        self.close()
