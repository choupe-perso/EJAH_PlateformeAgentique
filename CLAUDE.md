# EJAH - Plateforme agentique personnelle

Ce document est la reference de gouvernance du projet. Il s'applique a tout
travail effectue dans ce depot, quel que soit le worktree (DEV, TEST ou PROD)
ou la session qui intervient. En cas de doute entre une demande ponctuelle et
une regle ci-dessous, la regle prevaut sauf accord explicite et exprime de
l'utilisateur pour y deroger ponctuellement.

## Identite

- Nom produit : **EJAH** - Ecosysteme de Jonction et d'Assistance Humaine.
- Nom technique du projet / du repository / de la racine : **PlateformeIA_EJAH**
  (ecart assume avec le nom initialement envisage `EJAH_PlateformeAgentique` -
  tranche explicitement par l'utilisateur le 2026-09-13 : le dossier existant
  fait foi). Ne pas renommer cette racine. Ne pas creer de copie imbriquee
  (documentaire ou applicative) du projet.

## Finalite

EJAH est une plateforme agentique personnelle, concue pour fonctionner d'abord
localement, destinee initialement a un utilisateur unique. L'architecture
reste generique et reutilisable : aucun composant ne doit figer cette
restriction initiale en dur.

L'ambition est de relier les besoins, habitudes, donnees et outils de
l'utilisateur a des agents specialises. Une demande doit etre traitee dans le
bon contexte, avec les donnees autorisees et un moteur explicitement choisi.
L'utilisateur garde la maitrise des transmissions, des changements de moteur
et des depenses.

"Agentique" designe des comportements specialises orchestres par
l'application. Cela n'implique ni autonomie generale, ni planification
multi-agent, ni memoire permanente, ni execution libre d'actions tant que ces
capacites n'ont pas ete explicitement definies et livrees.

### Socle commun

La plateforme evite de reconstruire, pour chaque besoin, les memes contrats
d'acces aux moteurs et les memes regles de confidentialite. La reutilisation
ne concerne que les comportements reellement communs et n'autorise aucun
partage implicite de donnees, modeles ou permissions entre contextes. La
coherence recherchee porte sur : la selection des moteurs, les controles de
transmission, la separation des workspaces, la maintenabilite.

## Univers

Deux grands univers structurent la plateforme :

- **Cockpit** : indicateurs de pilotage de l'utilisateur.
- **Agents** : outils et agents specialises.

Aucun indicateur n'est encore defini pour Cockpit (2026-09-13).

Le menu de navigation d'Agents (`/agents`, barre laterale) a ete defini le
2026-09-15 :

```text
Toolkit
  |_ Generiques
Perso
  |_ Voyages
  |_ Taches
```

Ce sont des categories de menu, pas encore des agents reels - aucun agent
n'est encore defini a l'interieur.

## Environnements

Trois environnements, chacun avec son URL/port propre - ce qui equivaut a 3
plateformes distinctes et donc 3 lanceurs :

| Environnement | Role                                  | Port | Base de donnees   |
|----------------|---------------------------------------|------|--------------------|
| DEV            | Developpement avec l'IA               | 3000 | `pf_ejah_db_dev`   |
| TEST           | L'IA a termine, l'utilisateur teste    | 3001 | `pf_ejah_db_test`  |
| PROD           | Verifie OK, utilisation nominale       | 3002 | `pf_ejah_db`       |

**Aucun autre port ni URL ne doit etre introduit sans accord explicite de
l'utilisateur.** Toute proposition de nouveau port/URL doit etre soumise et
validee avant creation.

### Modele physique : 3 worktrees git distincts

- `PlateformeIA_EJAH/` - worktree **PROD**, branche `main`. C'est le dossier
  racine historique du projet ; il designe desormais la production, pas le
  developpement (corrige le 2026-09-13 - au depart cree comme worktree
  DEV par defaut, ce qui ne correspondait pas a l'intention reelle).
- `PlateformeIA_EJAH-test/` - worktree **TEST**, branche `test`.
- `PlateformeIA_EJAH-dev/` - worktree **DEV**, branche `dev`.

Chaque worktree possede son propre `node_modules`, son propre fichier
`.env.local` (jamais commit) et tourne independamment sur son port. Voir
`config/.env.dev.example`, `config/.env.test.example`, `config/.env.prod.example`
pour la liste des cles attendues (sans valeurs).

## Git

- Depot distant (sauvegarde) : `origin` ->
  https://github.com/choupe-perso/EJAH_PlateformeAgentique.git - un seul
  depot GitHub, les 3 branches y sont poussees (pas de depot separe par
  environnement).
- Branche `dev` : travail de developpement avec l'IA.
- Branche `test` : version que l'utilisateur teste.
- Branche `main` : production.
- A chaque validation **explicite** d'une version par l'utilisateur sur un
  environnement donne, creer une version majeure `X.0` et un tag git
  correspondant, pour permettre un rollback a tout moment. Ne jamais tagger
  automatiquement sans validation explicite de l'utilisateur.
- **Exception assumee** : `deployment/restart.bat`, `deployment/stop.bat`,
  `deployment/_run.bat` et `src/styles/globals.css` (jetons de couleur
  `:root`) different intentionnellement de contenu entre les 3 branches
  (port/commande, et palette d'accent propres a chaque environnement -
  voir `UIDesigner/ejah-template-{dev,test,prod}.html`, qui ont chacun
  leur propre palette : DEV cyan/jaune, TEST vert/citron, PROD
  orange/rose/violet). Un futur merge `dev` -> `test` -> `main` produira
  normalement un conflit sur ces fichiers : c'est attendu, toujours garder
  la version de la branche cible, ne jamais ecraser avec celle de la
  branche source.
- Les fichiers de configuration contenant des comptes d'authentification sont
  suivis sous git **sans valeurs** (uniquement les cles). Les fichiers reels
  contenant des valeurs sont dans `.gitignore` et ne doivent jamais etre
  commit.

## Base de donnees

PostgreSQL 18 local, une base par environnement (voir tableau ci-dessus).
Usages prevus au socle :
- Historique des actions (`action_history`)
- Historique des deploiements (`deployment_history`)
- Menus (`menu_item`)

Schema Prisma : `prisma/schema.prisma`. Toute evolution de schema passe par
une migration versionnee (pas de modification manuelle de la base en prod).

## Regles de base (imperatives)

1. **Suppression interdite sans accord explicite.** La plateforme n'a le
   droit de supprimer quoi que ce soit (donnees, fichiers, enregistrements)
   qu'apres accord explicite de l'utilisateur. Aucune derogation, meme pour
   du nettoyage juge anodin.
2. **Aucune commande a cout sans double confirmation.** Aucune commande
   susceptible d'entrainer un cout n'est autorisee pour le socle
   documentaire. Pour toute depense future :
   - 1re confirmation : objet, fournisseur, montant ou plafond.
   - 2e confirmation : accord explicite avant engagement.
   - Le paiement final est toujours realise manuellement par l'utilisateur,
     jamais par la plateforme ou par Claude.
3. **Pas de nouveaux ports/URLs sans accord explicite** (voir Environnements).
4. **Pas de changement implicite de moteur IA/donnees.** Si un moteur choisi
   est indisponible, l'operation s'arrete. L'utilisateur peut choisir
   explicitement un autre moteur, avec un nouveau controle des donnees et de
   la destination.

## Fonctionnement local et serveur (cible a 6 mois)

Actuellement : travail sur portable uniquement.

Cible : un serveur dedie externe, accessible depuis l'exterieur, devient la
tete de la plateforme ; portable/tablette/telephone deviennent des
consommateurs.

Contraintes imperatives pour le portable :
- Doit demarrer et fournir ses capacites locales **sans Internet et sans
  serveur distant**, avec les ressources locales necessaires deja preparees.
- Le demarrage ne doit exiger **ni authentification distante, ni
  telechargement indispensable a la volee, ni appel IA externe**.
- Cela ne promet pas l'usage d'un fournisseur externe hors ligne, ni un
  traitement local si le modele necessaire manque.

```text
Portable autonome
  |- future application locale
  |- future instance PostgreSQL locale
  `- ressources locales prealablement disponibles
         |
         | synchronisation applicative autorisee
         | uniquement pour les donnees compatibles
         v
Futur serveur
  `- instance PostgreSQL prevue
```

Le serveur ne doit jamais devenir une dependance du fonctionnement local. Son
hebergement et ses mecanismes d'acces restent a concevoir - ce schema decrit
une cible, aucun service demarre ni protocole retenu a ce jour.

Si un moteur choisi est indisponible, l'operation s'arrete ; seul un choix
explicite de l'utilisateur permet de basculer sur un autre moteur.

## Stack technique (decidee le 2026-09-13)

- **Next.js (App Router) + TypeScript** : API et frontend dans un seul
  langage, adapte aux besoins exprimes (API, graphiques, appels systeme,
  reactivite, responsive design).
- **Tailwind CSS** pour le responsive design.
- **Recharts** pour les graphiques.
- **Prisma** pour l'acces PostgreSQL et la discipline de migrations.
- Les appels systeme (side Agents) s'executent cote serveur (route handlers
  Next.js / Node.js), jamais cote navigateur.

Node.js (v24.19.0 LTS) a ete installe le 2026-09-13 via winget, a
l'initiative de l'utilisateur.

## Architecture en couches (decidee le 2026-09-13)

Pour eviter que `src/` ne devienne un fourre-tout, le code applicatif suit
une architecture en couches avec une responsabilite et une exclusion
explicites par dossier (detail et regles de dependance dans
`docs/ARCHITECTURE.md`, section 4bis ; chaque dossier porte aussi son
propre README) :

| Dossier            | Responsabilite cible                                    | Exclusion essentielle |
|---------------------|----------------------------------------------------------|------------------------|
| `src/app/`          | Routeur Next.js (impose par le framework) - web          | Orchestration metier (voir `core/`) |
| `src/components/`   | Composants UI partages - web                              | Acces direct a PostgreSQL ou aux fournisseurs IA |
| `src/core/`         | Cas d'usage, orchestration, controle des politiques       | Dependance metier aux adaptateurs concrets |
| `src/data/`         | Adaptateurs de persistance                                 | Donnees PostgreSQL reelles et logique metier |
| `src/integrations/` | Adaptateurs vers moteurs et systemes externes              | Choix autonome du moteur et logique metier |
| `src/agents/`       | Definitions et comportements d'agents, via contrats        | Acces direct aux fournisseurs, au stockage ou aux sessions |
| `src/shared/`       | Contrats, types et utilitaires reellement communs          | Orchestration et dependance vers les autres couches |
| `config/`           | Modeles declaratifs et validation future                  | Secrets reels et logique metier |
| `tests/`            | Verifications futures des comportements et frontieres      | Fixtures contenant des donnees reelles |
| `docs/`             | References techniques et decisions                         | Seconde racine applicative |
| `guide/`            | Parcours pedagogique et reproduction                        | Procedures presentees comme disponibles avant realisation |
| `deployment/`       | Assemblage, installation et restauration futurs             | Service distant obligatoire au demarrage local |

Note : `app/` designe ici exclusivement le routeur Next.js (contrainte du
framework, nom non modifiable). La couche d'orchestration/cas d'usage porte
le nom `core/`, precisement pour ne pas entrer en collision avec cette
contrainte.

## Maquettes UI (reference future)

Des maquettes HTML autonomes existent deja, une par environnement, dans
`LocalClaudeProjects/UIDesigner/` (`ejah-template-dev.html`,
`ejah-template-test.html`, `ejah-template-prod.html`, plus
`ejah-template-prod.md` qui decrit la structure). Elles definissent un
systeme de design complet (typographies, header sticky, onglets
Cockpit/Agents, galerie de composants de formulaire, footer a frises
chronologiques) qui doit servir de reference fidele lors du portage de
l'interface reelle. Ne pas redessiner l'UI a partir de zero sans consulter
ces fichiers.

**Etat du portage (2026-09-14)** : l'integralite de `ejah-template-dev.html`
a ete portee et validee sur la page cachee `/gabarit` (non reliee a la
navigation, non indexee) - header, KPI, mini-graphiques par agent,
repartition des statuts, liste d'agents (4 etats de bouton), galerie
complete de formulaire (12 types de champs), footer (dates, 2 frises
chronologiques, signature). Composants reutilisables dans `src/components/`
(racine, `form/`, `footer/`). `/gabarit` sert desormais de source pour
construire les vraies pages `/cockpit` et `/agents` (etape non demarree).

**Omission assumee** : la maquette HTML contient aussi une barre laterale
de navigation (`aside.sidebar`, categories repliables) qui n'est pas
decrite dans `ejah-template-prod.md` et n'a pas ete portee. A statuer
explicitement avec l'utilisateur avant de la construire.

## Etat d'avancement

- 2026-09-13 : creation du socle (arborescence, gouvernance, configuration,
  squelette Cockpit/Agents vide, worktrees dev/test/prod). npm install
  verifie (client Prisma genere), typecheck OK, serveur de dev demarre et
  rend les pages placeholder. Aucune fonctionnalite metier livree. Aucun tag
  de version cree (aucune validation explicite d'environnement n'a encore eu
  lieu).
- 2026-09-13 : depot pousse sur `origin` (GitHub, 3 branches). Les 3 bases
  PostgreSQL (`pf_ejah_db_dev`, `pf_ejah_db_test`, `pf_ejah_db`) ont ete
  creees par l'utilisateur. Le portage des maquettes UI reste a faire.
- 2026-09-13 : premiere validation explicite de l'utilisateur sur les 3
  environnements. Version majeure **1.0** creee et taguee (points de
  rollback) : `dev-v1.0` (`a5a9ebf`), `test-v1.0` (`d194778`),
  `prod-v1.0` (`767ede1`) - pousses sur `origin`. Perimetre valide : socle
  applicatif complet (voir sections precedentes), aucune fonctionnalite
  Cockpit/Agents.
- 2026-09-14 : portage complet de `ejah-template-dev.html` sur la page
  cachee `/gabarit` (6 tranches : header, KPI, mini-graphiques,
  statuts/liste d'agents, galerie de formulaire, footer). Header egalement
  integre au layout global (visible sur toutes les pages reelles).
- 2026-09-15 : construction des vraies pages `/cockpit` et `/agents` avec
  les composants valides sur `/gabarit` (etat vide, sans donnees de
  demonstration). Menu `/agents` reel (Toolkit/Perso). Fix `/api/health`
  (voir plus haut). Merge `dev` -> `test` le 2026-09-15.
