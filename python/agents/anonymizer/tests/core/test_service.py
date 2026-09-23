# Créé par Cédric HOUPE.
# Usage ou reproduction à l'identique interdit sans autorisation.
from pathlib import Path

import pytest

from app.service import AgentRequest, process_one


def test_request_rejects_out_with_multiple_inputs() -> None:
    with pytest.raises(ValueError):
        AgentRequest(
            command="inspect",
            input_paths=[Path("a.txt"), Path("b.txt")],
            out_path=Path("out.txt"),
        )


def test_request_requires_vault_for_anonymize() -> None:
    with pytest.raises(ValueError):
        AgentRequest(command="anonymize", input_paths=[Path("a.txt")])


def test_process_one_reports_unsupported_format_as_file_error(tmp_path: Path) -> None:
    unsupported = tmp_path / "notes.md"
    unsupported.write_text("hello", encoding="utf-8")
    result = process_one("inspect", unsupported, None, None)
    assert result.error is not None
    assert result.spans == []
