# deployment/

**Responsabilite cible** : assemblage, installation et restauration futurs
(scripts de mise en route d'un environnement, procedures de rollback vers
un tag git).

**Exclusion essentielle** : aucun service distant obligatoire au demarrage
local - conforme a la contrainte de fonctionnement hors ligne du portable
(voir CLAUDE.md, section "Fonctionnement local et serveur").

## Contenu (environnement PROD, port 3002)

- `restart.bat` : arrete le serveur s'il tourne (aucune erreur sinon), puis
  relance `npm run build && npm run start` dans une nouvelle fenetre.
- `stop.bat` : arrete le serveur s'il tourne (aucune erreur sinon).
- `_run.bat` : script interne appele par `restart.bat`, pas destine a etre
  lance directement.
- `raccourcis-bureau/` : raccourcis Windows (`.lnk`) prets a glisser sur le
  bureau - specifiques a cette machine, jamais suivis par git.

Ce contenu est propre a l'environnement PROD (port, build de production).
Les worktrees DEV et TEST ont leur propre version de ces scripts, avec
leur port et leur commande. Ces fichiers divergent donc intentionnellement
d'une branche a l'autre.
