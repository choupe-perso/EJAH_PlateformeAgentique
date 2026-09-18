# NOTE (patch EJAH, non present dans le script source d'ADBI) : `--json` a
# ete retire de la version 2.0.0 amont. EJAH (src/integrations/anonymizer/
# cli.ts) a toujours besoin d'une sortie structuree pour la commande
# `inspect` (affichage du detail par entite dans l'UI Inspecter, avant
# anonymisation) - `anonymize`/`deanonymize` n'en ont pas besoin (le chemin
# de sortie est deja impose via --out, le decompte se lit sur la ligne
# humaine). Ce patch est intentionnellement minimal et isole (voir
# `_JSON_PATCH_*` ci-dessous) pour rester facile a reappliquer si une
# nouvelle version amont de ce fichier est vendee dans EJAH.
from __future__ import annotations

import argparse
import getpass
import glob as glob_module
import json as _json_patch_module
import os
import sys
from pathlib import Path

from anonymizer.formats.dispatch import get_handler
from anonymizer.span import Span as _JsonPatchSpan
from anonymizer.vault import Vault, WrongPassphraseError

_SUPPORTED_SUFFIXES = frozenset({".txt", ".docx", ".pptx", ".xlsx", ".pdf"})


def _json_patch_span_to_dict(s: _JsonPatchSpan) -> dict:
    return {
        "start": s.start,
        "end": s.end,
        "text": s.text,
        "entityType": s.entity_type.value,
        "score": s.score,
        "source": s.source,
    }


def _read_passphrase(prompt: str) -> str:
    env_value = os.environ.get("ANONYMIZER_PASSPHRASE")
    if env_value is not None:
        return env_value
    return getpass.getpass(prompt)


def _resolve_inputs(
    patterns: list[str], *, skip_generated: bool = True
) -> tuple[list[Path], bool]:
    """Expand each CLI argument - a file, a directory (walked recursively),
    or a glob pattern (Windows' cmd.exe never expands wildcards itself,
    unlike a Unix shell, so this has to happen here) - into concrete files,
    in a stable order, without duplicates. Returns (files, had_missing) -
    `had_missing` is True if any argument was a literal path that doesn't
    exist or a glob pattern that matched nothing, so callers can fold that
    into their exit code even though such an argument contributes no file
    to iterate over.

    Files discovered via a directory/glob expansion are filtered to
    supported extensions and, when `skip_generated` (the default - used by
    `inspect`/`anonymize`), skip a previous run's own output
    (`*.anon.<ext>`, `*.restored.txt`), so re-running a batch over the same
    folder doesn't re-anonymize its own generated files. `deanonymize`
    passes `skip_generated=False` since `*.anon.<ext>` is exactly what it
    needs to pick up. A file named explicitly always bypasses both filters
    - same as today's single-file behavior, unsupported extensions still
    surface a clear per-file error."""
    resolved: list[Path] = []
    seen: set[Path] = set()
    had_missing = False

    def _add(path: Path, *, explicit: bool) -> None:
        if not path.is_file():
            return
        if not explicit:
            if path.suffix.lower() not in _SUPPORTED_SUFFIXES:
                return
            if skip_generated and path.stem.endswith((".anon", ".restored")):
                return
        real = path.resolve()
        if real in seen:
            return
        seen.add(real)
        resolved.append(path)

    for pattern in patterns:
        path = Path(pattern)
        if path.is_dir():
            for candidate in sorted(path.rglob("*")):
                _add(candidate, explicit=False)
        elif any(ch in pattern for ch in "*?["):
            matches = sorted(glob_module.glob(pattern, recursive=True))
            if not matches:
                print(f"Aucun fichier ne correspond à : {pattern}", file=sys.stderr)
                had_missing = True
            for match in matches:
                _add(Path(match), explicit=False)
        elif path.is_file():
            _add(path, explicit=True)
        else:
            print(f"Introuvable : {pattern}", file=sys.stderr)
            had_missing = True

    return resolved, had_missing


def cmd_inspect(args: argparse.Namespace) -> int:
    paths, had_error = _resolve_inputs(args.input)
    if not paths:
        message = "Aucun fichier à inspecter."
        if getattr(args, "json", False):
            print(_json_patch_module.dumps({"ok": False, "erreur": message}))
        else:
            print(message, file=sys.stderr)
        return 1

    # --json (patch EJAH) : pas de multi-fichier cote EJAH (un seul fichier
    # a la fois, voir integrations/anonymizer/cli.ts) - premiere erreur
    # rencontree arrete la boucle et devient l'erreur JSON, comme avant ce
    # patch. Le texte humain (--quiet compris) est inchange, code intact.
    if getattr(args, "json", False):
        all_spans: list[_JsonPatchSpan] = []
        for path in paths:
            try:
                all_spans.extend(get_handler(path).inspect(path))
            except Exception as exc:
                print(_json_patch_module.dumps({"ok": False, "erreur": f"{path} : {exc}"}))
                return 1
        print(_json_patch_module.dumps({"ok": True, "spans": [_json_patch_span_to_dict(s) for s in all_spans]}))
        return 0

    multi = len(paths) > 1
    total_spans = 0
    for path in paths:
        try:
            spans = get_handler(path).inspect(path)
        except Exception as exc:
            print(f"Erreur sur {path} : {exc}", file=sys.stderr)
            had_error = True
            continue
        total_spans += len(spans)
        if args.quiet:
            continue
        if multi:
            print(f"== {path} ==")
        if not spans:
            print("Aucune entité détectée.")
        else:
            width = max(len(s.entity_type.value) for s in spans)
            for s in spans:
                preview = s.text if len(s.text) <= 60 else s.text[:57] + "..."
                print(f"{s.entity_type.value:<{width}}  score={s.score:.2f}  {preview!r}")
            print(f"{len(spans)} entité(s) détectée(s).")
        if multi:
            print()

    if not args.quiet and multi:
        print(f"Total : {len(paths)} fichier(s), {total_spans} entité(s) détectée(s).")
    return 1 if had_error else 0


def cmd_anonymize(args: argparse.Namespace) -> int:
    paths, had_error = _resolve_inputs(args.input)
    if not paths:
        print("Aucun fichier à anonymiser.", file=sys.stderr)
        return 1
    if args.out and len(paths) > 1:
        print("Erreur : --out n'est utilisable qu'avec un seul fichier en entrée.", file=sys.stderr)
        return 1

    passphrase = _read_passphrase("Passphrase du vault (créé si absent) : ")
    out_arg = Path(args.out) if args.out else None
    try:
        with Vault(args.vault, passphrase) as vault:
            total_spans = 0
            for path in paths:
                try:
                    handler = get_handler(path)
                    out_path, spans = handler.anonymize(path, vault, out_arg)
                except Exception as exc:
                    print(f"Erreur sur {path} : {exc}", file=sys.stderr)
                    had_error = True
                    continue
                total_spans += len(spans)
                if not args.quiet:
                    print(f"{len(spans)} entité(s) anonymisée(s) -> {out_path}")
    except WrongPassphraseError as exc:
        print(f"Erreur : {exc}", file=sys.stderr)
        return 1

    if not args.quiet and len(paths) > 1:
        print(f"Total : {len(paths)} fichier(s), {total_spans} entité(s) anonymisée(s).")
    return 1 if had_error else 0


def cmd_deanonymize(args: argparse.Namespace) -> int:
    paths, had_error = _resolve_inputs(args.input, skip_generated=False)
    if not paths:
        print("Aucun fichier à restaurer.", file=sys.stderr)
        return 1
    if args.out and len(paths) > 1:
        print("Erreur : --out n'est utilisable qu'avec un seul fichier en entrée.", file=sys.stderr)
        return 1

    # Resolve every file's handler (and check it actually supports
    # restoration - pdf_handler doesn't, a PDF is converted to a fresh
    # .docx by anonymize() and that .docx is what gets restored) before
    # ever prompting for the passphrase - if the whole batch turns out
    # unsupported, there's no point opening the vault at all.
    restorable: list[tuple[Path, object]] = []
    for path in paths:
        try:
            handler = get_handler(path)
        except ValueError as exc:
            print(f"Erreur sur {path} : {exc}", file=sys.stderr)
            had_error = True
            continue
        if not hasattr(handler, "deanonymize"):
            print(
                f"Erreur : la restauration n'est pas supportée pour le format "
                f"{path.suffix!r} ({path}).",
                file=sys.stderr,
            )
            had_error = True
            continue
        restorable.append((path, handler))

    if not restorable:
        return 1

    passphrase = _read_passphrase("Passphrase du vault : ")
    out_arg = Path(args.out) if args.out else None
    try:
        with Vault(args.vault, passphrase) as vault:
            for path, handler in restorable:
                try:
                    out_path = handler.deanonymize(path, vault, out_arg)
                except Exception as exc:
                    print(f"Erreur sur {path} : {exc}", file=sys.stderr)
                    had_error = True
                    continue
                if not args.quiet:
                    print(f"Texte restauré -> {out_path}")
    except WrongPassphraseError as exc:
        print(f"Erreur : {exc}", file=sys.stderr)
        return 1

    return 1 if had_error else 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="anonymizer")
    sub = parser.add_subparsers(dest="command", required=True)

    p_inspect = sub.add_parser("inspect", help="Détecte les entités sans toucher au vault")
    p_inspect.add_argument(
        "input", nargs="+", help="Fichier(s), dossier(s) ou motif(s) glob (ex. data\\*.docx)"
    )
    p_inspect.add_argument(
        "--quiet", "-q", action="store_true", help="N'affiche rien en cas de succès (script/CI)"
    )
    p_inspect.add_argument(
        "--json", action="store_true", help="Sortie JSON (patch EJAH, integration uniquement)"
    )
    p_inspect.set_defaults(func=cmd_inspect)

    p_anon = sub.add_parser("anonymize", help="Anonymise un ou plusieurs documents")
    p_anon.add_argument(
        "input", nargs="+", help="Fichier(s), dossier(s) ou motif(s) glob (ex. data\\*.docx)"
    )
    p_anon.add_argument("--vault", required=True)
    p_anon.add_argument("--out", help="Chemin de sortie - uniquement avec un seul fichier en entrée")
    p_anon.add_argument(
        "--quiet", "-q", action="store_true", help="N'affiche rien en cas de succès (script/CI)"
    )
    p_anon.set_defaults(func=cmd_anonymize)

    p_deanon = sub.add_parser("deanonymize", help="Restaure un ou plusieurs fichiers anonymisés")
    p_deanon.add_argument(
        "input", nargs="+", help="Fichier(s), dossier(s) ou motif(s) glob (ex. data\\*.anon.txt)"
    )
    p_deanon.add_argument("--vault", required=True)
    p_deanon.add_argument("--out", help="Chemin de sortie - uniquement avec un seul fichier en entrée")
    p_deanon.add_argument(
        "--quiet", "-q", action="store_true", help="N'affiche rien en cas de succès (script/CI)"
    )
    p_deanon.set_defaults(func=cmd_deanonymize)

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        return args.func(args)
    except ValueError as exc:
        print(f"Erreur : {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
