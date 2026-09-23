# ejah-agent-anonymizer-core

Créé par Cédric HOUPE.
Usage ou reproduction à l'identique interdit sans autorisation.

Cœur applicatif (sans CLI) de l'agent EJAH d'anonymisation réversible de
documents. Destiné à être dupliqué dans la plateforme web EJAH et à
évoluer ensuite **indépendamment** du dépôt source
(`EJAH_Agents/agents/anonymizer/`) — ce paquet ne pointe vers aucune
dépendance vivante vers ce dépôt.

## Ce que contient ce paquet

- `app/` — le cœur applicatif : détection, tokenisation, formats de
  document (`.txt`, `.docx`, `.pptx`, `.xlsx`, `.pdf`), coffre chiffré.
- `manifest.yaml`, `contract.yaml` — le contrat formel (capacités,
  entrées/sorties) de l'agent.
- `tests/core/`, `tests/contract/` — tests unitaires du cœur.
- `tests/fixtures/`, `tests/eval_golden_*.py` — corpus doré et scripts
  de scoring du rappel de détection, pour vérifier après toute évolution
  de votre côté que la précision ne régresse pas.
- `scripts/extract_golden_*.py` — utilitaires ayant servi à construire
  le corpus doré, au cas où vous voudriez l'étendre.

**Ce que ce paquet ne contient volontairement PAS** : de CLI, de
lanceurs DOS, d'installateur. Ce sont des préoccupations de l'exposition
DOS, pas du cœur.

## Installation

```bash
pip install -e .
python -m spacy download fr_core_news_lg
```

## Utilisation

```python
from app.service import AgentRequest, execute

request = AgentRequest(
    command="anonymize",          # "inspect" | "anonymize" | "deanonymize"
    input_paths=[chemin_fichier],
    vault_path=chemin_vault,      # None pour "inspect"
    passphrase=passphrase,        # None pour "inspect"
    out_path=chemin_sortie,       # optionnel
)
response = execute(request)       # AgentResponse : command, results, message
```

Pour un traitement fichier par fichier avec rapport de progression,
utiliser `process_one(command, path, vault, out_path) -> FileResult`
(même module) avec un `app.domain.vault.Vault` déjà ouvert.

**Contrats de données** :
- `AgentRequest` : `command`, `input_paths`, `vault_path`, `passphrase`, `out_path`.
- `AgentResponse` : `command`, `results: list[FileResult]`, `message`.
- `FileResult` : `input_path`, `output_path`, `spans: list[Span]`, `error`.
- `Span` (`app/domain/span.py`) : `start`, `end`, `text`, `entity_type`
  (`app/domain/entities.py::EntityType`), `score`, `source`.

## Ce que ce paquet n'implémente PAS (à votre charge côté plateforme)

- **Contrôle d'accès** "consultant ADBI" - le cœur ne l'impose pas, ce
  n'est pas sa responsabilité. Implémentez votre propre
  authentification/habilitation.
- **Avertissement de non-garantie de résultat** - à afficher/faire
  acquitter dans votre UI, à chaque session ou upload : la détection
  automatisée n'est pas exhaustive ni exempte d'erreur, l'utilisateur
  doit vérifier le résultat avant toute diffusion.
- **Stockage applicatif** (utilisateurs, sessions, historique) - prévu
  pour être en base (PostgreSQL) côté plateforme, indépendamment de ce
  paquet.
- **Stockage du vault** - actuellement un fichier SQLite chiffré
  (`app/domain/vault.py::Vault`), pas injecté derrière une interface de
  stockage. Deux options si vous avez besoin d'un stockage base de
  données pour le vault :
  1. Garder le vault en fichier (un par session/traitement), sur un
     volume applicatif contrôlé par la plateforme.
  2. Faire évoluer `Vault` pour respecter une interface de stockage
     injectable - ce changement doit être fait dans le dépôt source
     (`EJAH_Agents/agents/anonymizer/`), pas divergé silencieusement
     dans votre copie, pour rester synchronisable.

## Tests

```bash
pip install -e ".[dev]"
pytest -q
python tests/eval_golden_corpus.py
python tests/eval_golden_histoires.py
```
