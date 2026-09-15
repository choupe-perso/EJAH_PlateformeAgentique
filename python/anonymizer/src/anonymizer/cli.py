from __future__ import annotations

import argparse
import getpass
import json
import os
import sys
from pathlib import Path

from anonymizer.formats.dispatch import get_handler
from anonymizer.span import Span
from anonymizer.vault import Vault, WrongPassphraseError


def _read_passphrase(prompt: str) -> str:
    env_value = os.environ.get("ANONYMIZER_PASSPHRASE")
    if env_value is not None:
        return env_value
    return getpass.getpass(prompt)


def _span_to_dict(s: Span) -> dict:
    return {
        "start": s.start,
        "end": s.end,
        "text": s.text,
        "entityType": s.entity_type.value,
        "score": s.score,
        "source": s.source,
    }


def cmd_inspect(args: argparse.Namespace) -> int:
    handler = get_handler(Path(args.input))
    spans = handler.inspect(Path(args.input), avec_images=args.images)
    if args.json:
        print(json.dumps({"ok": True, "spans": [_span_to_dict(s) for s in spans]}))
        return 0
    if not spans:
        print("Aucune entité détectée.")
        return 0
    width = max(len(s.entity_type.value) for s in spans)
    for s in spans:
        preview = s.text if len(s.text) <= 60 else s.text[:57] + "..."
        print(f"{s.entity_type.value:<{width}}  score={s.score:.2f}  {preview!r}")
    print(f"\n{len(spans)} entité(s) détectée(s).")
    return 0


def cmd_anonymize(args: argparse.Namespace) -> int:
    handler = get_handler(Path(args.input))
    passphrase = _read_passphrase("Passphrase du vault (créé si absent) : ")
    out_arg = Path(args.out) if args.out else None
    try:
        with Vault(args.vault, passphrase) as vault:
            out_path, spans = handler.anonymize(
                Path(args.input), vault, out_arg, avec_images=args.images
            )
    except WrongPassphraseError as exc:
        if args.json:
            print(json.dumps({"ok": False, "erreur": str(exc)}))
            return 1
        print(f"Erreur : {exc}", file=sys.stderr)
        return 1

    if args.json:
        print(json.dumps({
            "ok": True,
            "outPath": str(out_path),
            "spans": [_span_to_dict(s) for s in spans],
        }))
        return 0
    print(f"{len(spans)} entité(s) anonymisée(s) -> {out_path}")
    return 0


def cmd_deanonymize(args: argparse.Namespace) -> int:
    input_path = Path(args.input)
    handler = get_handler(input_path)
    if not hasattr(handler, "deanonymize"):
        message = (
            f"La restauration n'est pas supportée pour le format {input_path.suffix!r} "
            "; consultez le vault pour retrouver les valeurs d'origine."
        )
        if args.json:
            print(json.dumps({"ok": False, "erreur": message}))
            return 1
        print(f"Erreur : {message}", file=sys.stderr)
        return 1

    passphrase = _read_passphrase("Passphrase du vault : ")
    out_arg = Path(args.out) if args.out else None
    try:
        with Vault(args.vault, passphrase) as vault:
            out_path = handler.deanonymize(input_path, vault, out_arg)
    except WrongPassphraseError as exc:
        if args.json:
            print(json.dumps({"ok": False, "erreur": str(exc)}))
            return 1
        print(f"Erreur : {exc}", file=sys.stderr)
        return 1

    if args.json:
        print(json.dumps({"ok": True, "outPath": str(out_path)}))
        return 0
    print(f"Texte restauré -> {out_path}")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="anonymizer")
    sub = parser.add_subparsers(dest="command", required=True)

    p_inspect = sub.add_parser("inspect", help="Détecte les entités sans toucher au vault")
    p_inspect.add_argument("input")
    p_inspect.add_argument("--json", action="store_true", help="Sortie JSON (pour intégration EJAH)")
    p_inspect.add_argument(
        "--no-images",
        dest="images",
        action="store_false",
        default=True,
        help="Ignore les images embarquées (pas d'OCR) - docx/pptx/xlsx uniquement",
    )
    p_inspect.set_defaults(func=cmd_inspect)

    p_anon = sub.add_parser("anonymize", help="Anonymise un fichier texte")
    p_anon.add_argument("input")
    p_anon.add_argument("--vault", required=True)
    p_anon.add_argument("--out")
    p_anon.add_argument("--json", action="store_true", help="Sortie JSON (pour intégration EJAH)")
    p_anon.add_argument(
        "--no-images",
        dest="images",
        action="store_false",
        default=True,
        help="Ignore les images embarquées (pas d'OCR) - docx/pptx/xlsx uniquement",
    )
    p_anon.set_defaults(func=cmd_anonymize)

    p_deanon = sub.add_parser("deanonymize", help="Restaure un fichier texte anonymisé")
    p_deanon.add_argument("input")
    p_deanon.add_argument("--vault", required=True)
    p_deanon.add_argument("--out")
    p_deanon.add_argument("--json", action="store_true", help="Sortie JSON (pour intégration EJAH)")
    p_deanon.set_defaults(func=cmd_deanonymize)

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        return args.func(args)
    except ValueError as exc:
        if getattr(args, "json", False):
            print(json.dumps({"ok": False, "erreur": str(exc)}))
            return 1
        print(f"Erreur : {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
