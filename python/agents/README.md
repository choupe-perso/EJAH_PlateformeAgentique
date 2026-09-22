# python/agents/

Un sous-dossier par agent Python installé. Voir `python/README.md` pour la
procédure d'installation d'un nouvel agent.

| Agent | Fournisseur | Licence |
|---|---|---|
| `anonymizer/` | ADBI (Cédric Houpe) | Propriété exclusive ADBI - usage réservé aux consultants ADBI dans le cadre de leurs missions. Ne jamais diffuser `app/` hors de ce cadre. |
| `voyages/` | Cédric Houpe (agent personnel, catégorie "Perso") | Usage personnel - reproduction à l'identique interdite sans autorisation. Pas d'accès ADBI requis. Voir `python/agents/voyages/README.md` pour l'avertissement sur la commande `recuperer` (session Chrome interactive, jusqu'à 5 min, poste local avec utilisateur présent - jamais appelée depuis un serveur distant). |

**Rappel structure par agent** (voir `python/agents/anonymizer/README.md`
pour le détail propre à cet agent) :
- Fichiers du fournisseur (jamais modifiés) : `app/`, `contract.yaml`,
  `manifest.yaml`, `pyproject.toml`, `README.md`, `tests/`, `scripts/`.
- Fichier de la plateforme (jamais synchronisé avec le fournisseur) :
  `web_adapter.py`.
