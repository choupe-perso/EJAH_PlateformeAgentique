# Moteur d'anonymisation (Python)

Moteur de detection et pseudonymisation reversible de donnees personnelles
(regex, dictionnaires, NER spaCy, OCR local) pour fichiers `.txt`, `.docx`,
`.pptx`, `.xlsx`, `.pdf`. Invoque par `src/integrations/anonymizer/cli.ts` en
sous-processus depuis la plateforme - jamais importe directement (Next.js ne
sait pas executer du Python).

Fonctionne entierement en local a l'execution : aucun appel reseau apres
l'installation initiale.

Version vendee : **2.0.0** (mise a jour le 2026-09-16 depuis le script
source de l'utilisateur - `toolkit_ejah_anonymisation_v2.0.zip`, proprietaire
ADBI). Changements marquants depuis la 1.0.0 :

- **Restauration complete** desormais pour `.docx`/`.pptx`/`.xlsx` (texte
  et images swappees), pas seulement `.txt` - le vault existant se met a
  niveau automatiquement (`kind` sur chaque mapping, migration transparente
  a l'ouverture, aucune action manuelle).
- **PDF en entree** : converti une fois en `.docx` (pypdf, pas de
  redaction ciblee fiable en PDF pur), puis traite via le pipeline
  docx deja reversible. La sortie est donc toujours un `.docx`, jamais un
  `.pdf` - c'est ce `.docx` qui se restaure, pas le PDF d'origine.
- **OCR des images embarquees toujours actif** (docx/pptx/xlsx) - l'ancien
  bouton bascule "Inclure les images (OCR)" et le flag `--no-images`
  n'existent plus, cote moteur comme cote UI EJAH.
- **Entree multi-fichiers** (fichier, dossier ou motif glob) sur `inspect`/
  `anonymize`/`deanonymize` - non exploite par EJAH (un fichier a la fois
  dans `AnonymisationManager.tsx`), mais disponible en CLI directe.

## Installation (une fois par worktree)

Depuis `python/anonymizer/` :

```bash
python -m venv .venv
.venv\Scripts\python.exe -m pip install --upgrade pip
.venv\Scripts\python.exe -m pip install -e .
.venv\Scripts\python.exe -m spacy download fr_core_news_lg
```

Le telechargement du modele linguistique francais (`fr_core_news_lg`,
~600 Mo) necessite une connexion internet, une seule fois. `.venv/` n'est
jamais commit (voir `.gitignore`) - a refaire sur chaque worktree/poste.
Apres une mise a jour de ce moteur (nouvelle vendee), refaire uniquement
`pip install -e .` pour prendre en compte une eventuelle nouvelle
dependance (ex. `pypdf` ajoute en 2.0.0) - inutile de recreer le venv ni
de retelecharger le modele spaCy.

## Configuration

`ANONYMIZER_PASSPHRASE` dans `.env.local` (racine du worktree) : passphrase
du vault local chiffre (table de correspondance jeton -> valeur d'origine).
Jamais saisie dans la plateforme, jamais transmise en HTTP. La perdre rend
le vault existant illisible par conception (voir `src/anonymizer/vault.py`).

## Patch EJAH (`--json` sur `inspect` uniquement)

**Ce depot vendore n'est pas un miroir a l'identique du script source de
l'utilisateur** : `src/anonymizer/cli.py` porte un patch minime, clairement
marque dans le fichier (commentaire `NOTE (patch EJAH...)` en tete, symboles
prefixes `_json_patch_*`/`_JsonPatchSpan`), qui rajoute un flag `--json`
uniquement sur la sous-commande `inspect` - retire de la version 2.0.0
amont, mais necessaire a `AnonymisationManager.tsx` pour afficher le detail
par entite (type/texte/score) avant de lancer une anonymisation.
`anonymize`/`deanonymize` restent 100% fidèles au script source (aucun
besoin de JSON la : le chemin de sortie est impose via `--out`, le decompte
d'entites se lit sur la ligne de sortie humaine).

**En cas de nouvelle vendee depuis une future version du script source** :
remplacer tous les fichiers SAUF reappliquer ce meme patch sur `cli.py` (le
diff est petit et isole, voir les commentaires `NOTE`/`patch EJAH` dans le
fichier actuel pour le reproduire a l'identique).

## CLI directe (debogage)

```bash
.venv\Scripts\python.exe -m anonymizer.cli inspect <fichier> --json
.venv\Scripts\python.exe -m anonymizer.cli anonymize <fichier> --vault <vault.db> --out <sortie>
.venv\Scripts\python.exe -m anonymizer.cli deanonymize <fichier> --vault <vault.db> --out <sortie>
```

`--json` (patch EJAH, voir plus haut) n'existe que sur `inspect`.
`anonymize`/`deanonymize` n'en ont pas besoin ; ajouter `--quiet`/`-q` pour
ne rien afficher en cas de succes (comportement du script source).
