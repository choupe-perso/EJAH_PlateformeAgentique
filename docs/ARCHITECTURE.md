# Architecture du socle EJAH

## 1. Arborescence des environnements

```
LocalClaudeProjects/
  PlateformeIA_EJAH-dev/     <- worktree DEV (branche `dev`)  - port 3000
  PlateformeIA_EJAH-test/    <- worktree TEST (branche `test`) - port 3001
  PlateformeIA_EJAH/         <- worktree PROD (branche `main`) - port 3002
```

`PlateformeIA_EJAH/` (sans suffixe) est le dossier racine historique du
projet : il designe la production, pas le developpement. Corrige le
2026-09-13 (initialement cree comme worktree DEV par defaut).

Les trois dossiers partagent le meme historique git (`.git` commun au
worktree principal) mais sont physiquement independants : dependances
(`node_modules`), configuration (`.env.local`) et processus de lancement
propres a chacun. C'est le sens de "3 plateformes distinctes, donc 3
lanceurs" exprime dans la gouvernance.

Creation des worktrees TEST et PROD (deja effectuee lors de la mise en place
du socle) :

```bash
git worktree add ../PlateformeIA_EJAH-dev dev
git worktree add ../PlateformeIA_EJAH-test test
```

(le worktree PROD est le dossier racine `PlateformeIA_EJAH/` lui-meme, sur
la branche `main`.)

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

## 4. Node.js

Installe le 2026-09-13 via `winget install OpenJS.NodeJS.LTS` (v24.19.0
LTS), a l'initiative de l'utilisateur. A refaire dans **chaque** worktree
apres un `git worktree add`, ou apres tout changement de dependances :

```bash
npm install
```

## 4bis. Couches applicatives (`src/`)

Le code applicatif suit une architecture en couches, avec une exclusion
explicite par dossier (voir aussi le README present dans chacun) :

```
src/
  app/            <- routeur Next.js (impose par le framework) - web/presentation
  components/     <- composants UI partages - web/presentation
  core/           <- cas d'usage, orchestration, politiques
  data/           <- adaptateurs de persistance (Prisma)
  integrations/   <- adaptateurs vers moteurs IA / systemes externes
  agents/         <- definitions et comportements d'agents (via contrats)
  shared/         <- contrats, types, utilitaires reellement communs
  styles/         <- feuilles de style globales
```

Regle de dependance : `app/` et `components/` (web) appellent `core/` ;
`core/` orchestre `data/`, `integrations/` et `agents/` via des contrats
definis dans `shared/` ; `agents/` n'accede jamais directement a
`integrations/` ou `data/` sans passer par `core/`. `shared/` ne depend
d'aucune autre couche.

Exception assumee : `app/` designe ici le routeur Next.js (contrainte du
framework, non renommable) et non la couche d'orchestration - celle-ci
porte le nom `core/` precisement pour eviter la confusion.

D'autres dossiers a la racine du depot suivent le meme principe
(responsabilite + exclusion documentees dans leur propre README) :
`tests/`, `guide/`, `deployment/`, `config/`.

## 5. Secrets et configuration

Chaque environnement a son fichier d'exemple versionne sous git, cles sans
valeurs :

- `config/.env.dev.example`
- `config/.env.test.example`
- `config/.env.prod.example`

Le fichier reel a utiliser dans chaque worktree est `.env.local` a la racine
(charge automatiquement par Next.js), jamais commit (voir `.gitignore`).

## 5bis. Gateway agents Python (`python/`)

Decide le 2026-09-22 : certains agents (ex. anonymizer, livre par ADBI) ont
un coeur ecrit en Python (spaCy, OCR, parseurs de documents) que Node.js ne
peut pas importer directement. Plutot qu'un service par agent (ce qui
donnerait un port de plus a chaque nouvel agent Python), un seul processus
partage tous les agents Python derriere **un seul port par environnement** :

```
python/
  gateway/          <- service FastAPI generique, jamais specifique a un agent
    main.py           - endpoints /agents, /agents/{id}/execute, telechargement
    registry.py        - decouverte des agents installes (manifest.yaml/contract.yaml)
    worker_pool.py      - un sous-processus isole par agent, reutilise entre appels
    worker_main.py       - point d'entree execute dans chaque sous-processus worker
    run.py              - demarrage sur 127.0.0.1:GATEWAY_PORT
    requirements.txt
  agents/
    <agent_id>/
      app/ ...        <- coeur livre par le fournisseur, jamais modifie
      contract.yaml    <- idem, source de verite des champs (entrees/sorties)
      manifest.yaml    <- idem, metadonnees (nom, commandes, controle d'acces)
      web_adapter.py   <- ECRIT PAR LA PLATEFORME (jamais synchronise avec le
                          fournisseur) : traduit le contrat generique
                          (fields/files) vers l'entrypoint propre a l'agent.
```

Un nouvel agent Python = un nouveau sous-dossier `python/agents/<id>/` avec
son `web_adapter.py` - zero port supplementaire, zero modification de la
gateway. Cote Next.js, point d'entree unique : `src/integrations/python-agent-runtime.ts`.

**Isolation par agent** : chaque agent tourne dans son propre sous-processus
Python (`worker_pool.py`/`worker_main.py`), lance par la gateway au premier
appel et reutilise ensuite (pas relance a chaque requete, pour ne pas
recharger spaCy a chaque fois). Communication par lignes JSON sur
stdin/stdout - aucun port reseau supplementaire ouvert. Cette isolation
memoire complete est necessaire car le gabarit de livraison ADBI utilise
systematiquement un paquet top-level nomme `app` (voir `manifest.yaml` de
chaque agent, `entrypoint.module: app.service`) : deux agents de ce gabarit
charges dans un **meme** processus Python entreraient en collision
(`sys.modules["app"]` ecrase par le second agent charge). Un sous-processus
par agent elimine le probleme quel que soit le nombre d'agents installes.

Port dedie (nouveau, distinct des ports web 3000/3001/3002 - variable
`GATEWAY_PORT` / `PYTHON_AGENT_GATEWAY_URL` dans `config/.env.*.example`) :

| Environnement | Port gateway Python |
|----------------|----------------------|
| DEV            | 9010                 |
| TEST           | 9011                 |
| PROD           | 9012                 |

La gateway est liee a `127.0.0.1` uniquement (jamais exposee hors de la
machine locale) et n'a pas de dependance a Internet une fois son
environnement Python installe (`pip install`, telechargement du modele
spaCy) - conforme a la contrainte de fonctionnement local hors ligne.


## 6. Cible reseau (non implementee)

Voir la section "Fonctionnement local et serveur" de `CLAUDE.md`. Aucun
service reseau, aucune synchronisation avec un serveur distant n'est
implementee a ce stade - le portable doit rester 100% fonctionnel hors
ligne pour ses capacites locales.
