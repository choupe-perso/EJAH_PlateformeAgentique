# python/

**Responsabilité cible** : héberger le cœur des agents EJAH écrits en
Python (détection PII, OCR, traitement de documents...) derrière une
gateway HTTP locale unique, appelée par `src/integrations/python-agent-runtime.ts`.
Décision et détail complet : `docs/ARCHITECTURE.md`, section 5bis.

```
python/
  gateway/     <- service FastAPI générique (jamais specifique a un agent)
  agents/      <- un sous-dossier par agent Python installe
```

**Exclusion essentielle** : `gateway/` ne connaît la sémantique d'aucun
agent en particulier - un nouvel agent Python ne doit jamais nécessiter de
modifier `gateway/`, seulement d'ajouter un sous-dossier sous `agents/`.

## Installer un agent Python

1. Dupliquer le paquet cœur du fournisseur dans `python/agents/<agent_id>/`
   tel quel (`app/`, `contract.yaml`, `manifest.yaml`...) - jamais modifié,
   pour rester synchronisable avec le dépôt source du fournisseur.
2. Écrire `python/agents/<agent_id>/web_adapter.py` (proprieté de la
   plateforme, jamais synchronisé avec le fournisseur) exposant :
   ```python
   def run(command: str, fields: dict, files: dict[str, list[Path]]) -> dict:
       ...
   ```
   qui traduit le contrat générique (champs scalaires + fichiers uploadés,
   nommés d'après les propriétés `contract.yaml`) vers l'entrypoint propre
   à l'agent, et renvoie un dict correspondant à la section `output` de son
   `contract.yaml`.
3. Créer/mettre à jour le `venv` de la gateway avec les dépendances de
   l'agent (voir `gateway/README.md`).

## Démarrage

```bash
cd python/gateway
python -m venv .venv
.venv/Scripts/pip install -r requirements.txt -e ../agents/<agent_id>
set GATEWAY_PORT=9010
.venv/Scripts/python run.py
```

Liée à `127.0.0.1` uniquement - jamais exposée hors de la machine locale,
jamais appelée directement par le navigateur (uniquement par le serveur
Next.js, via `src/integrations/python-agent-runtime.ts`).
