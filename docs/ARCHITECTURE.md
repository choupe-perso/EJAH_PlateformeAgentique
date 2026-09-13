# Architecture du socle EJAH

## 1. Arborescence des environnements

```
LocalClaudeProjects/
  PlateformeIA_EJAH/         <- worktree DEV (branche `dev`)  - port 3000
  PlateformeIA_EJAH-test/    <- worktree TEST (branche `test`) - port 3001
  PlateformeIA_EJAH-prod/    <- worktree PROD (branche `main`) - port 3002
```

Les trois dossiers partagent le meme historique git (`.git` commun au
worktree principal) mais sont physiquement independants : dependances
(`node_modules`), configuration (`.env.local`) et processus de lancement
propres a chacun. C'est le sens de "3 plateformes distinctes, donc 3
lanceurs" exprime dans la gouvernance.

Creation des worktrees TEST et PROD (deja effectuee lors de la mise en place
du socle) :

```bash
git worktree add ../PlateformeIA_EJAH-test test
git worktree add ../PlateformeIA_EJAH-prod main
```

## 2. Cycle de vie d'une evolution

1. Developpement dans le worktree DEV, sur la branche `dev`.
2. Quand une evolution est consideree prete, merge `dev` -> `test`, puis
   test manuel dans le worktree TEST (`npm run build && npm run start` sur
   le port 3001).
3. Apres validation manuelle explicite par l'utilisateur sur TEST, merge
   `test` -> `main`, deploiement dans le worktree PROD (port 3002).
4. **Uniquement** lorsque l'utilisateur valide explicitement une version sur
   un environnement : creation d'une version majeure `X.0` et d'un tag git
   associe (`git tag vX.0`), pour permettre un rollback immediat.

Aucune etape de ce cycle n'est automatisee sans confirmation explicite de
l'utilisateur - en particulier le passage TEST -> PROD.

## 3. Base de donnees

PostgreSQL 18, service local `postgresql-x64-18` (deja installe et actif sur
ce poste). Une base par environnement :

| Environnement | Base               |
|----------------|--------------------|
| DEV            | `pf_ejah_db_dev`   |
| TEST           | `pf_ejah_db_test`  |
| PROD           | `pf_ejah_db`       |

Les bases ne sont pas creees automatiquement par ce socle (aucune commande
executee contre PostgreSQL a ce stade). A creer manuellement ou apres accord
explicite, par exemple :

```sql
CREATE DATABASE pf_ejah_db_dev;
```

Le schema applicatif (tables `action_history`, `deployment_history`,
`menu_item`) est defini dans `prisma/schema.prisma` et se deploie via
`npx prisma migrate dev` (DEV) ou `npx prisma migrate deploy` (TEST/PROD),
une fois `DATABASE_URL` renseigne dans le `.env.local` du worktree concerne.

## 4. Prerequis manquant : Node.js

Node.js/npm ne sont pas installes sur ce poste. Installation a realiser par
l'utilisateur (choix explicite du mode d'installation) :

```bash
winget install OpenJS.NodeJS.LTS
```

Apres installation, dans **chaque** worktree :

```bash
npm install
```

## 5. Secrets et configuration

Chaque environnement a son fichier d'exemple versionne sous git, cles sans
valeurs :

- `config/.env.dev.example`
- `config/.env.test.example`
- `config/.env.prod.example`

Le fichier reel a utiliser dans chaque worktree est `.env.local` a la racine
(charge automatiquement par Next.js), jamais commit (voir `.gitignore`).

## 6. Cible reseau (non implementee)

Voir la section "Fonctionnement local et serveur" de `CLAUDE.md`. Aucun
service reseau, aucune synchronisation avec un serveur distant n'est
implementee a ce stade - le portable doit rester 100% fonctionnel hors
ligne pour ses capacites locales.
