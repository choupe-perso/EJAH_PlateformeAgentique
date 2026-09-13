# core/

**Responsabilite cible** : cas d'usage, orchestration, controle des
politiques et separation future des regles de domaine.

**Exclusion essentielle** : aucune dependance metier aux adaptateurs
concrets (`data/`, `integrations/`). Ce dossier appelle des contrats
(interfaces), jamais une implementation Prisma ou un SDK tiers directement.

Vide pour le moment - aucun cas d'usage n'est encore defini.
