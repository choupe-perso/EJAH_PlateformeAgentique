# agents/

**Responsabilite cible** : definitions et comportements des agents,
s'appuyant sur des contrats (`shared/`).

**Exclusion essentielle** : aucun acces direct aux fournisseurs
(`integrations/`), au stockage (`data/`) ou aux sessions - un agent passe
toujours par `core/` pour orchestrer ses appels.

Vide pour le moment - aucun agent defini.
