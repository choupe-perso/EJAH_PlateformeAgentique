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
  |_ Anonymisation
Perso
  |_ Voyages
  |_ Taches
```

Mis a jour le 2026-09-22 : "Anonymisation" (agent livre par ADBI, coeur
Python derriere `python/gateway/`, voir `docs/ARCHITECTURE.md` section
5bis) est le premier agent reel du menu, accessible depuis
`/agents/anonymizer`. "Voyages" (agent personnel - calendrier .ics des
voyages SNCF a venir, meme gateway Python partagee, coeur sous
`python/agents/voyages/`) est le second, accessible depuis
`/agents/voyages` - voir avertissement dans `python/agents/voyages/README.md`
sur la commande `recuperer` (session Chrome interactive locale, jusqu'a 5
minutes, jamais appelee depuis un serveur distant). "Taches" (agent
personnel - RDV/Email/Prompt, validation et redaction assistee via Ollama
local, export .ics d'un RDV - meme gateway Python partagee, coeur sous
`python/agents/taches/`) est le troisieme, accessible depuis
`/agents/taches` - persistance (creation, liste, statut) geree par la
plateforme (PostgreSQL/Prisma, table `todos_transport`), jamais par le
coeur Python (voir `python/agents/taches/README.md`).

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

**Piege connu (outillage IA)** : les 3 worktrees ont chacun un
`.claude/launch.json` avec une configuration nommee `"ejah"` sur le port
3000 (meme nom partout - seul le port differe pour test/prod). Un outil de
preview qui resout cette config par nom sans repertoire explicite peut donc
demarrer le **mauvais** worktree (ex. PROD au lieu de DEV) sans erreur
visible - la page se charge, juste avec l'ancien code/l'ancienne palette
d'un autre environnement, ce qui peut se faire passer pour des symptomes
totalement differents (fonctionnalite absente, bouton inerte, etc.). Demarrer
le serveur du bon worktree explicitement (`cd` dans le bon dossier avant
`npm run dev`/`npm run start`) plutot que de se fier a une resolution par
nom seul ; en cas de comportement inexplicable dans le navigateur de
previsualisation, verifier en premier lieu quel repertoire (`cwd`) sert
reellement la page.

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
| `python/`           | Moteurs externes vendorises necessitant un runtime non-Node (invoques en sous-processus depuis `src/integrations/`) | Logique metier, import direct par le code TypeScript |

Note : `app/` designe ici exclusivement le routeur Next.js (contrainte du
framework, nom non modifiable). La couche d'orchestration/cas d'usage porte
le nom `core/`, precisement pour ne pas entrer en collision avec cette
contrainte.

`python/` a ete ajoute le 2026-09-15 pour l'agent Anonymisation : un moteur
Python (spaCy, regex, OCR local) ne peut pas etre reecrit en TypeScript sans
perte majeure, et ne peut pas non plus etre importe par webpack - il vit
dans son propre dossier, avec son propre environnement virtuel (jamais
commit), et n'est atteint par la plateforme qu'en sous-processus via
`src/integrations/<moteur>/`.

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
- 2026-09-15 : validation explicite de l'utilisateur sur TEST, merge
  `test` -> `main`. Version majeure **2.0** creee et taguee : `test-v2.0`,
  `prod-v2.0` - pousses sur `origin`. Verifie sur PROD : build + demarrage
  reussis (port 3002), palette de couleurs PROD (orange/rose/violet)
  correcte a l'ecran. Perimetre valide : interface complete (header,
  `/gabarit`, vraies pages `/cockpit`/`/agents` avec menu Toolkit/Perso).
- 2026-09-15 : correctif de fidelite couleur (3 valeurs codees en dur
  ratees lors du portage initial, decouvertes en diffant integralement
  les 3 fichiers `ejah-template-*.html` plutot que seulement leurs jetons
  `:root`) : `--topbar-mid` (couleur intermediaire du degrade du
  bandeau), `--tint-active-bg` (fond actif clair), `--btn-action-bg`
  (bouton d'action principal - fixe en orange sur TEST meme si le theme
  est vert, particularite assumee de la maquette). Applique et verifie
  sur les 3 environnements. Validation explicite de l'utilisateur,
  version majeure **3.0** creee et taguee : `dev-v3.0`, `test-v3.0`,
  `prod-v3.0` - pousses sur `origin`.
- 2026-09-15 : agent Taches (todos_transport) migre depuis l'ancienne
  plateforme Flask et valide de bout en bout (RDV, export .ics,
  brouillons Ollama email/prompt, marquage traite). Nouveau logo et
  favicon EJAH deployes sur les 3 environnements. Sur `/gabarit` :
  liseret Utilisateur/Plateforme repositionne (incruste dans le champ
  de saisie, pas a cote du libelle) et recolore en teintes fixes tres
  contrastees (orange `#FF6A00` / bleu fonce `var(--util-ink)`),
  independantes du theme d'environnement. Validation explicite de
  l'utilisateur sur DEV, version majeure **4.0** creee et taguee :
  `dev-v4.0` - pousse sur `origin`. Pas encore fusionne vers
  `test`/`main`.
- 2026-09-15 : agent Voyages (generateur_ics_sncf) migre depuis l'ancienne
  plateforme Flask - recuperation des voyages SNCF Connect (Playwright sur
  Chrome installe, authentification geree dans la fenetre ouverte) et
  generation d'un calendrier .ics (2 VEVENT par voyage : trajet 1h avant +
  train, alerte -1h sur chacun). La plateforme n'accepte plus jamais
  d'identifiants SNCF Connect via HTTP, a la demande explicite de
  l'utilisateur : nouveau script `deployment/enregistrer-identifiants-sncf.mjs`
  (CLI autonome, a executer hors de la plateforme, ecrit directement dans le
  Gestionnaire d'identifiants Windows) ; suppression du POST de
  `/api/agents/voyages/identifiants` (GET seul subsiste) et du formulaire
  email/mot de passe de `VoyagesManager`, remplaces par un etat "Valide"
  (sans formulaire) une fois configure, sinon par les deux commandes a
  executer (`cd "<racine>"` puis `node deployment/enregistrer-...mjs`),
  chacune avec son propre bouton copier. Voyages trouves tries et
  regroupes par mois. Validation explicite de l'utilisateur sur DEV,
  version majeure **5.0** creee et taguee : `dev-v5.0` - pousse sur
  `origin`.
- 2026-09-15 : renommage du menu Agents (Voyages -> Trajets SNCF, Taches
  -> TODO Offline) et suppression de l'entree Generiques (Toolkit reste
  affiche, vide). Merge `dev` -> `test` le 2026-09-15 (deuxieme fusion,
  inclut agents Voyages et Taches, flux d'identifiants SNCF sans HTTP,
  regroupement des voyages par mois). Verifie sur TEST : migration
  Prisma, build production et demarrage reussis (port 3001, palette verte
  correcte). Corrige au passage : `next build`/`next start` ne doivent
  jamais etre lances avec les variables de `.env.local` deja preinjectees
  dans le shell (Next les charge lui-meme) - sinon `NODE_ENV` s'en trouve
  fige a la valeur du fichier et casse le build production (erreur
  `useContext` sur toutes les pages) ; `next start` ne lit pas non plus
  `PORT` depuis `.env.local`, il faut le positionner explicitement avant
  (voir `deployment/_run.bat`, deja correct). Pas encore tague/valide par
  l'utilisateur sur TEST.
- 2026-09-15 : agent Anonymisation ajoute sous Toolkit - moteur Python
  vendorise (`python/anonymizer/`, voir son propre README) portant
  detection (regex, dictionnaires, NER spaCy `fr_core_news_lg`, OCR local
  ONNX) et pseudonymisation reversible (vault SQLite chiffre,
  passphrase locale via `ANONYMIZER_PASSPHRASE` dans `.env.local`, jamais
  saisie dans la plateforme) pour fichiers `.txt`/`.docx`/`.pptx`/`.xlsx` -
  la restauration automatique n'est disponible que pour `.txt`. Invoque en
  sous-processus par `src/integrations/anonymizer/cli.ts` (sortie `--json`
  ajoutee au CLI Python pour un echange structure). Fonctionne
  entierement en local, aucun appel reseau a l'execution (seul le
  telechargement initial du modele linguistique en a necessite un, fait
  une fois). Verifie de bout en bout sur DEV (inspection, anonymisation,
  restauration - aller-retour exact confirme). Corrige au passage :
  `ActionButton` n'avait aucun style visuel pour l'etat `disabled` hors
  variant "loading" (bouton desactive identique a actif, donc semblait
  inerte sans explication - visible surtout sur Anonymisation ou les 3
  actions demarrent desactivees) ; ajout de `disabled:opacity-45
  disabled:cursor-not-allowed`, applique partout. Ajout d'un bouton
  "Reinitialiser" (variant "ghost", nouveau) sur la page Anonymisation.
  Nom affiche du header personnalisable via `APP_DISPLAY_NAME` dans
  `.env.local` (retombe sur "EJAH" si absent) - DEV configure avec "Mon
  assistante Lucile" ; scope volontairement limite au header (titre de
  page, footer, page d'accueil et gouvernance CLAUDE.md inchanges).
  Validation explicite de l'utilisateur sur DEV, version majeure **6.0**
  creee et taguee : `dev-v6.0` - pousse sur `origin`. Pas encore fusionne
  vers `test`/`main`.
- 2026-09-15 : agent Anonymisation - option pour inclure ou non les images
  embarquees (OCR) dans la detection, de bout en bout (flag `--no-images`
  sur le CLI Python, parametre `avecImages` sur l'adaptateur Node et les
  routes API, case a cocher dans l'UI - cochee par defaut, desactivee
  pour les `.txt`). Verifie avec un `.docx` contenant une image porteuse
  de PII (nom + telephone) : detectes quand cochee, ignores sinon.
  Validation explicite de l'utilisateur sur DEV, version majeure **7.0**
  creee et taguee : `dev-v7.0` - pousse sur `origin`.
- 2026-09-15 : merge `dev` -> `test` (troisieme fusion : agent
  Anonymisation complet dont l'option images/OCR, correctif du style
  `disabled` sur `ActionButton`, nom affiche du header personnalisable).
  Necessite une installation du moteur Python sur TEST (venv dedie +
  `ANONYMIZER_PASSPHRASE` dans `.env.local` - voir
  `python/anonymizer/README.md`). Pas encore valide par l'utilisateur sur
  TEST.
- 2026-09-15/16 : corrections de retours utilisateur sur 3 agents.
  `ActionButton` : le variant "loading" etait a la fois estompe et sans
  animation visible (ancien style partage avec l'etat `disabled` generique) ;
  ajout d'un spinner automatique pour "loading" et retrait de l'estompage
  sur ce variant precis - seuls les AUTRES boutons (inactifs pendant
  qu'une action tourne) restent estompes desormais. Corrige le
  cross-disable manquant sur Anonymisation. `TachesManager` : date de
  creation affichee sur les taches actives, section "Taches traitees"
  repliee par defaut triee par date de traitement decroissante.
  `EmailForm`/`PromptForm` : liserets Utilisateur/Plateforme (`Field`) sur
  tous les champs, champs generes en lecture seule avec un bouton
  "Recopier les champs dans espace utilisateur" pour les rendre editables,
  minuteur en direct dans le bouton pendant la generation Ollama, bouton
  copier par champ genere (`Field` accepte un `texteACopier` optionnel).
  Regle "termine par Je te/vous remercie si une question est posee"
  ajoutee aux fragments tutoiement/vouvoiement (pas a `regles.txt`,
  independant du registre). Diagnostic en cours de route : le port 3000 de
  DEV tournait par erreur en mode production (`next start`, sans watcher)
  au lieu de `next dev` - explique une longue serie de faux symptomes
  (modifications de code invisibles) ; a verifier systematiquement en cas
  de comportement inexplicable (`curl -I` : `Cache-Control: no-store`
  attendu en dev, `x-nextjs-cache: HIT` trahit un serveur de production).
- 2026-09-16 : agent Veille ajoute sous Toolkit - centre de veille
  informationnelle personnel (qualification d'un besoin par dialogue avec
  un moteur au choix - Ollama local/Gemini/ChatGPT Web -, proposition de
  sources validees par l'utilisateur, moteur d'analyse choisi separement,
  execution avec deduplication deterministe et historique de versions,
  dashboard KPI + historique tracable de bout en bout). Trois moteurs
  branchables derriere un contrat commun (`ok`/`indisponible`, jamais de
  bascule silencieuse vers un autre moteur). ChatGPT Web reutilise le
  pattern Playwright + profil persistant deja etabli pour SNCF, sans
  automatiser la connexion. Cles `GEMINI_API_KEY`/`GEMINI_MODEL`/
  `VEILLE_RUN_TOKEN` ajoutees a `config/.env.dev.example`, sans valeurs.
  Verifie de bout en bout dans le navigateur avec le moteur Ollama :
  parcours complet de qualification (dialogue reel, question de
  clarification, contrat final coherent), creation du sujet, execution
  reelle - echoue proprement (sans crash) sur les 3 sources choisies pour
  le test (page Samsung protegee/rendue en JS, hote injoignable, Twitter
  bloque le fetch simple), comportement V1 attendu et documente pour des
  sources non compatibles avec un simple fetch (pas de rendu JS par site
  en V1). Corrige au passage : `FIELD_FAMILY_COLOR` extrait de `Field.tsx`
  vers `fieldFamilyColor.ts` (un composant serveur ne peut pas importer
  une constante depuis un module "use client") ; `TextInput`/`TextArea`
  ignoraient silencieusement un `className` passe par l'appelant. Travail
  initialement demarre par une session parallele sur le meme worktree DEV
  (l'utilisateur a explicitement arrete de travailler en double session et
  demande de reprendre Veille) ; aucun document de specification separe
  trouve dans le depot malgre ~90 commentaires "EXG-0xx" - le code fait foi.
  Pas encore valide par l'utilisateur.
- 2026-09-18 : agent Anonymisation - support PDF (nouveau
  `python/anonymizer/formats/pdf_handler.py`). Agent Veille - moteur
  "ollama_leger" (nouvelle valeur enum `VeilleMoteur`, migration Prisma),
  routes de saisie manuelle dialogue/prompt (`/api/veille/sujets/
  dialogue-manuel`, `/prompt-manuel`) sans passer par le dialogue
  qualificatif standard. Merge `dev` -> `test` (quatrieme fusion). Pas
  encore valide par l'utilisateur sur TEST.
- 2026-09-18 : merge `test` -> `main` (agents Taches, Voyages,
  Anonymisation, Veille - dont le support PDF et le moteur "ollama_leger" -
  et l'ensemble des correctifs UI associes, voir entrees precedentes).
  Conflits attendus resolus en gardant la version PROD sur
  `src/styles/globals.css` (palette orange/rose/violet) et la version
  corrigee (sans estompage) du variant "loading" de `ActionButton`. Pas
  encore valide par l'utilisateur sur PROD.
- 2026-09-18/22 (historique DEV, reconstitue apres retour a `dev-v3.0`) :
  les vraies pages `/cockpit` et `/agents` restent des placeholders - le
  portage vers ces pages reelles n'a pas commence. Aucun tag de version
  cree (pas de validation explicite d'environnement pour ce travail).
- 2026-09-22 : integration de l'agent "Voyages" (`/agents/voyages`), coeur
  Python de Cedric Houpe installe sous `python/agents/voyages/` derriere
  la gateway partagee existante (`python/gateway/`, deja utilisee par
  anonymizer - aucun nouveau port). Deux extensions generiques apportees a
  la gateway (aucune ne connait la semantique d'un agent en particulier) :
  support d'un champ `collection` de type JSON (au-dela des seuls
  scalaires/fichiers, necessaire a la commande `generer`) et execution du
  worker dans un thread separe (`asyncio.to_thread`) pour qu'un appel
  bloquant (la commande `recuperer` peut bloquer jusqu'a 5 minutes -
  session Chrome interactive, 2FA manuelle) ne gele pas la gateway pour
  les autres agents. Correction egalement d'un bug latent decouvert a
  cette occasion dans `src/integrations/python-agent-runtime.ts` : le
  cache fetch de Next.js servait une liste d'agents perimee (`cache:
  "no-store"` ajoute sur les 3 appels). 29 tests du paquet fournisseur
  verifies au passage (`pytest`, tous verts). Aucun tag de version cree
  (pas de validation explicite d'environnement pour ce travail).
- 2026-09-22 : integration de l'agent "Taches" (`/agents/taches`), coeur
  Python installe sous `python/agents/taches/` derriere la gateway
  partagee (`python/gateway/`, aucun nouveau port). Une premiere migration
  (commit `43761b3`, 15/09) avait porte cet agent depuis l'ancienne
  plateforme Flask (`agents/todos_transport`) entierement en TypeScript
  (Prisma + client Ollama direct + regles de validation en TS) sur les
  branches `main`/`test` - jamais mergee sur `dev`, et incompatible avec le
  pattern coeur-Python-derriere-gateway etabli depuis pour Anonymisation et
  Voyages. Rebatie ici en Python (validation, assemblage des prompts
  Ollama depuis des fragments `.txt` copies tels quels, construction du
  .ics) en reprenant la logique metier de cette premiere migration ;
  persistance (creation/liste/statut, table `todos_transport`) et
  historique (`ActionHistory`) restes cote plateforme (Prisma), jamais
  dans le coeur. Extensions generiques mineures apportees a 2 composants
  partages (deja presentes dans la premiere migration TS, reintroduites
  ici) : `ActionButton` (variante `ghost`) et `Field` (bouton copier
  optionnel `texteACopier`) - aucune n'est specifique a Taches. 14 tests du
  coeur Python verifies (`pytest`, tous verts) ; non teste de bout en bout
  cote plateforme (base de donnees et Ollama non verifies en conditions
  reelles pour ce travail). Aucun tag de version cree (pas de validation
  explicite d'environnement pour ce travail).
- 2026-09-23 : merge `dev` -> `test` (cinquieme fusion, la plus importante :
  remplace entierement l'ancienne architecture d'agents par la nouvelle).
  L'utilisateur a explicitement change de principe pour les agents (retour
  de `dev` a l'etat du tag `dev-v3.0` avant reconstruction) : abandon de
  l'ancien agent Veille et de l'ancienne implementation TypeScript de
  Taches/Voyages, remplaces par le pattern coeur-Python-derriere-gateway
  (voir entrees precedentes et `docs/ARCHITECTURE.md` section 5bis).
  Environ 140 fichiers de l'ancienne architecture supprimes de TEST (code
  seulement - tables `veille_*` et ancienne structure `todos_transport`
  non touchees en base, disponibles pour verification ulterieure si
  besoin). Migration Prisma reconstituee en baseline sur DEV
  (`20260923000000_init`, zero derive verifiee avant application) : les
  modeles Veille restent dans schema.prisma (donnees reelles existantes,
  a ne pas supprimer sans verification explicite) meme si l'application
  ne les utilise plus. Corrige au passage : lien menu "Taches" sans `href`
  (rendu inerte) ; affichage de l'heure de RDV a tort converti au fuseau
  du navigateur (`toLocaleString` sur une heure murale flottante) ;
  timeout par defaut du fetch Node (5 min, undici) pris a tort pour une
  gateway injoignable sur les gros documents - bascule sur le
  fetch/Agent d'undici avec timeout desactive pour cet appel local de
  confiance. Logo et favicon EJAH mis a jour, `favicon.ico` regenere
  (l'ancien etait corrompu).
- 2026-09-23 : correctif d'un bug de build production sur l'agent Voyages,
  decouvert lors de la verification de TEST (`npm run build` echouait -
  jamais relance depuis l'ajout d'undici sur `dev`) : le composant client
  `src/app/agents/voyages/page.tsx` importait une valeur (`TARGET_URL`)
  depuis `core/agents/voyages.ts`, entrainant tout le module cote
  navigateur (y compris `integrations/python-agent-runtime.ts` et son
  dependance `undici`, incompatible avec le bundler webpack cote client).
  Deplace vers `src/shared/voyages.ts` (sans dependance serveur). Corrige
  sur `dev`, reporte sur `test` par un nouveau merge. Environnement TEST
  entierement provisionne : venv Python dedie (`python/gateway/.venv`),
  3 agents installes (anonymizer, voyages, taches), modele spaCy
  `fr_core_news_lg` telecharge (613 Mo, accord explicite prealable).
  Verifie de bout en bout dans le navigateur (port 3001 + gateway port
  9011) : build production reussi, palette verte correcte, menu Toolkit
  (Anonymisation)/Perso (Voyages, Taches) sans trace de Veille, les 3
  pages d'agent chargent sans erreur console. Validation explicite de
  l'utilisateur sur TEST, version majeure **9.0** creee et taguee :
  `test-v9.0` - pousse sur `origin`.
- 2026-09-23 : merge `test` -> `main` (deuxieme fusion depuis le nouveau
  principe d'agents ; ajoute l'agent Taches et l'ensemble des correctifs
  documentes ci-dessus - PROD avait deja recu l'essentiel de la nouvelle
  architecture lors de la fusion du 18/09, un seul conflit reel cette fois
  sur ce fichier). Environnement PROD entierement provisionne (venv Python
  dedie, 3 agents, modele spaCy). Validation explicite de l'utilisateur
  sur DEV, TEST et PROD - versions majeures **10.0** creees et taguees
  sur les 3 environnements : `dev-v10.0`, `test-v10.0`, `prod-v10.0` -
  pousses sur `origin` (numerotation alignee ; `dev-v8.0`/`dev-v9.0`
  restent d'anciens points de rollback intermediaires, non fusionnes tels
  quels).
