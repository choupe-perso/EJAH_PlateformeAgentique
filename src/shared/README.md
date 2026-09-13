# shared/

**Responsabilite cible** : contrats, types et utilitaires reellement
communs (ex : `env.ts`).

**Exclusion essentielle** : aucune orchestration ici, aucune dependance
vers les autres couches (`core/`, `data/`, `integrations/`, `agents/`,
`app/`) - ce dossier ne doit dependre de rien d'autre dans `src/`, tout le
reste peut en dependre.
