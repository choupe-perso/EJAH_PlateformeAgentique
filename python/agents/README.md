# python/agents/

Un sous-dossier par agent Python installé. Voir `python/README.md` pour la
procédure d'installation d'un nouvel agent.

| Agent | Fournisseur | Licence |
|---|---|---|
| `anonymizer/` | ADBI (Cédric Houpe) | Propriété exclusive ADBI - usage réservé aux consultants ADBI dans le cadre de leurs missions. Ne jamais diffuser `app/` hors de ce cadre. |

**Rappel structure par agent** (voir `python/agents/anonymizer/README.md`
pour le détail propre à cet agent) :
- Fichiers du fournisseur (jamais modifiés) : `app/`, `contract.yaml`,
  `manifest.yaml`, `pyproject.toml`, `README.md`, `tests/`, `scripts/`.
- Fichier de la plateforme (jamais synchronisé avec le fournisseur) :
  `web_adapter.py`.
