# components/

Partie de la responsabilite **web** (presentation), au meme titre que
`src/app/`. Composants UI partages entre plusieurs pages/routes.

**Exclusion essentielle** : aucun acces direct a PostgreSQL ou aux
fournisseurs IA - un composant invoque un cas d'usage (`core/`), jamais
`data/` ou `integrations/` directement.

Vide pour le moment.
