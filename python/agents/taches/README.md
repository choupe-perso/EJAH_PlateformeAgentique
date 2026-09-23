# À faire — intégration web de l'agent Tâches

Créé par Cédric HOUPE.
Usage ou reproduction à l'identique interdit sans autorisation.

Ce dossier est la livraison du paquet cœur pour un projet qui consomme
l'agent **Tâches** (RDV/Email/Prompt) comme bibliothèque - typiquement
`PlateformeIA_EJAH` (page `/agents/taches`).

## Contenu de ce dossier

| Fichier | Rôle |
|---|---|
| `deployToWeb/taches_core_web_*.zip` | Le paquet à dupliquer dans votre plateforme (voir §1). Contient `app/` (dont `app/integrations/ollama/prompts/`, les fragments `.txt` de rédaction), `contract.yaml`, `manifest.yaml`, `pyproject.toml`, `tests/core/`, `tests/contract/`, et ce même `README.md`. |

Contrairement à `voyages`, pas encore de CLI ni d'installeur autonome
(`adapters/cli/`, `installer/`) : cet agent n'a pour l'instant qu'un usage
web. Pas de fichier de schéma supplémentaire non plus - tout ce dont un
consommateur a besoin (champs d'entrée/sortie, erreurs nommées) est déjà
entièrement décrit par `contract.yaml`.

## 1. Ce que vous devez faire du paquet

1. Dézipper `deployToWeb/taches_core_web_*.zip` dans `python/agents/taches/`
   de votre plateforme - cette copie devient la
   vôtre, indépendante de ce dépôt source.
2. `pip install -e .` (aucune dépendance tierce - stdlib uniquement).
3. Importer et appeler directement, jamais en sous-processus / CLI :

```python
from app.service import AgentRequest, execute

# Valider les donnees d'un RDV avant de le persister cote plateforme
response = execute(AgentRequest(command="valider", type="rdv", titre="RDV dentiste",
                                 date_debut="2026-10-01T09:00", duree_minutes="60", alerte_minutes="30"))
# response.erreurs: list[str] (vide si exploitable)

# Rediger un brouillon d'email
response = execute(AgentRequest(command="rediger_brouillon", type="email",
                                 destinataire="le client", notes="reporter le rdv de mardi",
                                 registre="vouvoiement", ton="professionnel", longueur="court"))
# response.titre, response.texte

# Generer le .ics d'un RDV deja persiste (id fourni par la plateforme)
response = execute(AgentRequest(command="generer_ics", id="abc123", titre="RDV dentiste",
                                 date_debut="2026-10-01T09:00:00", duree_minutes="60", alerte_minutes="30"))
# response.ics_contenu: str
```

`AgentResponse` : `command`, `message`, `erreurs`, `titre`, `texte`,
`ics_contenu`, `error`, `error_kind` (`"validation" | "configuration" |
"integration" | "technique"`, référentiel §22). Détail complet des champs
(obligatoire/optionnel par commande) : `contract.yaml`, à la racine du
paquet - c'est la source de vérité, ce README ne fait que l'expliquer.

---

## 2. Ollama local (rediger_brouillon / reecrire_brouillon)

Ce cœur appelle un serveur Ollama local (`http://localhost:11434` par
défaut, modèle `qwen3:8b` par défaut) - surchargeables via les variables
d'environnement `OLLAMA_HOST` / `OLLAMA_MODEL` du **processus qui exécute
la gateway Python** (pas du `.env.local` de Next.js, jamais lu par ce
cœur). Un appel peut prendre jusqu'à plusieurs minutes sur un poste sans
GPU - jamais bloquant pour le reste de la plateforme (exécuté dans le
worker dédié de cet agent, voir `python/gateway/worker_pool.py`).

Les règles rédactionnelles (rôle, règles, style personnel, paramètres)
vivent dans des fichiers texte sous `app/integrations/ollama/prompts/` -
copiés tels quels depuis l'ancienne plateforme Flask
(`agents/todos_transport/`), le style personnel de l'utilisateur n'est pas
reformulé. Modifier le ton, le style ou les règles se fait en éditant ces
`.txt`, jamais en touchant au code Python.

---

## 3. Contrôle d'accès et avertissement légal

Comme `voyages` et contrairement à `anonymizer`, cet agent **n'a pas** de
contrôle d'accès "consultant ADBI" - c'est un agent personnel (catégorie
"Perso" de la plateforme EJAH).

---

## 4. Stockage (référentiel §14)

Le cœur ne stocke rien lui-même : `valider` ne fait que vérifier des
champs, `rediger_brouillon`/`reecrire_brouillon` renvoient un brouillon en
mémoire, `generer_ics` renvoie le contenu `.ics` en mémoire. La création,
la liste des tâches actives/traitées et le marquage "traité" sont
entièrement du ressort du consommateur web (typiquement PostgreSQL via
Prisma, table `todos_transport`) - le Core ne l'impose pas.

---

## 5. Anti-patterns interdits (référentiel §31)

```text
WEB → regles metier (validation d'une tache, construction du .ics, assemblage des prompts Ollama)
WEB → appel direct a un serveur Ollama (integrations/ollama/ duplique cote web)
WEB → sous-processus vers une CLI (aucune CLI livree dans ce paquet pour l'instant)
```
