# Moteur d'anonymisation (Python)

Moteur de detection et pseudonymisation reversible de donnees personnelles
(regex, dictionnaires, NER spaCy, OCR local) pour fichiers `.txt`, `.docx`,
`.pptx`, `.xlsx`. Invoque par `src/integrations/anonymizer/cli.ts` en
sous-processus depuis la plateforme - jamais importe directement (Next.js ne
sait pas executer du Python).

Fonctionne entierement en local a l'execution : aucun appel reseau apres
l'installation initiale.

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

## Configuration

`ANONYMIZER_PASSPHRASE` dans `.env.local` (racine du worktree) : passphrase
du vault local chiffre (table de correspondance jeton -> valeur d'origine).
Jamais saisie dans la plateforme, jamais transmise en HTTP. La perdre rend
le vault existant illisible par conception (voir `src/anonymizer/vault.py`).

## CLI directe (debogage)

```bash
.venv\Scripts\python.exe -m anonymizer.cli inspect <fichier> --json
.venv\Scripts\python.exe -m anonymizer.cli anonymize <fichier> --vault <vault.db> --out <sortie> --json
.venv\Scripts\python.exe -m anonymizer.cli deanonymize <fichier.txt> --vault <vault.db> --out <sortie> --json
```

`--json` a ete ajoute pour l'integration EJAH (sortie structuree plutot que
texte formate pour humain).
