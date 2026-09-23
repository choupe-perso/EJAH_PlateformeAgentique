# À faire — intégration web de l'agent Voyages

Créé par Cédric HOUPE.
Usage ou reproduction à l'identique interdit sans autorisation.

> **ÉCART PLATEFORME (2026-09-22)** — cette copie livrée diverge
> volontairement du paquet zip d'origine (`voyages_core_web_*.zip`), décision
> explicite de l'utilisateur lors de l'intégration web : reporter le même
> correctif dans `EJAH_Agents/agents/voyages/` si vous voulez resynchroniser.
> Deux changements, tous deux rétrocompatibles (paramètres optionnels) :
> - `app/service.py` : la commande `recuperer` ne bloque plus si aucun
>   identifiant n'est enregistré (`identifiants_configures()` retiré de son
>   chemin) - l'auto-remplissage reste un confort optionnel,
>   `app/integrations/sncf/scraping.py` gérant déjà très bien une connexion
>   100% manuelle. Raison : l'interface web ne propose plus d'enregistrer
>   d'identifiants, l'utilisateur se connecte toujours lui-même dans la
>   fenêtre Chrome ouverte par `recuperer`.
> - `app/integrations/sncf/scraping.py` : `recuperer_voyages()` accepte un
>   paramètre optionnel `on_progress: Callable[[str], None] | None = None`,
>   appelé avec `"authentification"` avant d'attendre la page cible puis
>   `"scraping"` une fois trouvée - permet à l'adaptateur web d'afficher une
>   progression réelle (jusqu'à 5 min d'attente vs. quelques secondes de
>   scraping) plutôt qu'un simple indicateur de chargement générique.

Ce dossier est la livraison du paquet cœur pour un projet qui consomme
l'agent **Voyages** (calendrier SNCF) comme bibliothèque - typiquement
`PlateformeIA_EJAH` (page `/agents/voyages`).

## Contenu de ce dossier

| Fichier | Rôle |
|---|---|
| `voyages_core_web.zip` | Le paquet à dupliquer dans votre plateforme (voir §1). Contient `app/`, `contract.yaml`, `manifest.yaml`, `pyproject.toml`, `tests/core/`, `tests/contract/`, et ce même `README.md`. |

Pas de fichier de schéma supplémentaire ici : contrairement à
`anonymizer`, tout ce dont un consommateur a besoin (champs d'entrée/
sortie, erreurs nommées) est déjà entièrement décrit par `contract.yaml`
- rien à régénérer.

---

## 1. Ce que vous devez faire du paquet

1. Dézipper `voyages_core_web.zip` dans votre plateforme - **cette
   copie devient la vôtre**, indépendante de ce dépôt source. Pas de
   lien vivant à maintenir (pas de submodule, pas de dépendance pip
   pointant ici).
2. `pip install -e .` puis `python -m playwright install chrome`.
3. Importer et appeler directement, **jamais en sous-processus / CLI** :

```python
from app.service import AgentRequest, execute

# Verifier si des identifiants SNCF Connect sont enregistres
response = execute(AgentRequest(command="identifiants_statut"))
# response.configures: bool

# Enregistrer des identifiants (voir avertissement §2 sur qui doit faire ca)
response = execute(AgentRequest(
    command="identifiants_definir", email="...", mot_de_passe="...",
))

# Recuperer les voyages a venir (voir AVERTISSEMENT §2 - operation
# interactive et longue, PAS un simple appel HTTP synchrone)
response = execute(AgentRequest(command="recuperer", headless=False))
# response.voyages: list[dict] | None, response.error / response.error_kind

# Generer le calendrier a partir des voyages selectionnes par l'utilisateur
response = execute(AgentRequest(command="generer", voyages=voyages_selectionnes))
# response.ics_contenu: str (contenu texte du fichier .ics, a proposer en telechargement)
```

`AgentResponse` : `command`, `message`, `configures`, `voyages`,
`ics_contenu`, `error`, `error_kind` (`"validation" | "configuration" |
"integration" | "technique"`, référentiel §22). Détail complet des
champs (obligatoire/optionnel par commande) : `contract.yaml`, à la
racine du paquet - c'est la source de vérité, ce README ne fait que
l'expliquer.

---

## 2. AVERTISSEMENT — `recuperer` n'est pas un appel HTTP classique

C'est le point qui n'est **pas** dans `contract.yaml` et qui casse le
modèle habituel "requête web → réponse en quelques centaines de
millisecondes" :

- `recuperer` ouvre une **vraie fenêtre Chrome visible** sur la machine
  qui exécute le code Python, et peut **bloquer jusqu'à 5 minutes** si
  l'utilisateur doit terminer une double authentification manuellement
  dans cette fenêtre.
- Ça suppose un **poste local avec un utilisateur physiquement présent
  devant un écran** au moment de l'appel - pas un serveur web distant
  sans tête (headless server), pas un traitement multi-utilisateur
  concurrent (une seule session Chrome à la fois, profil persistant
  partagé - voir `app/integrations/sncf/scraping.py::PROFILE_DIR`).
- Si votre plateforme tourne sur un serveur distant (cible "6 mois" du
  socle EJAH), **n'appelez pas `recuperer` depuis ce serveur** : soit
  l'appel reste réservé à un contexte local (le poste de l'utilisateur
  lui-même exécute ce code), soit une refonte du scraping est nécessaire
  (ex. tâche planifiée locale qui pousse un fichier JSON déjà récupéré
  vers le serveur) - **à trancher avec le propriétaire du dépôt avant de
  coder quoi que ce soit dans cette direction**, ce n'est pas un détail
  d'implémentation mineur.
- `identifiants_definir` stocke le mot de passe dans le **Gestionnaire
  d'identifiants Windows de la machine locale** (`keyring`, service
  `EJAH-Voyages`) - pas dans une base de données, pas par session/
  utilisateur web. Un serveur multi-utilisateurs ne doit **jamais**
  appeler cette commande pour le compte d'un utilisateur distant.

En résumé : ce cœur a été conçu et testé pour un **usage personnel sur
un seul poste**, pas encore pour un déploiement web multi-utilisateurs.
Si votre intégration vise un vrai serveur partagé, revenez vers ce dépôt
avant d'aller plus loin plutôt que de contourner ces contraintes côté
web.

---

## 3. Contrôle d'accès et avertissement légal

Contrairement à `anonymizer`, cet agent **n'a pas** de contrôle d'accès
"consultant ADBI" ni d'avertissement de non-garantie de résultat - c'est
un agent personnel (catégorie "Perso" de la plateforme EJAH), pas un
outil professionnel ADBI. Rien à réimplémenter de ce côté.

---

## 4. Stockage (référentiel §14)

Le cœur ne stocke rien lui-même en base : `recuperer` renvoie les
voyages en mémoire (`response.voyages`), `generer` renvoie le contenu
`.ics` en mémoire (`response.ics_contenu`). C'est au consommateur web de
décider s'il persiste ces données (ex. `PostgreSQL` pour un historique)
et sous quelle forme - le Core ne l'impose pas.

---

## 5. Anti-patterns interdits (référentiel §31)

```text
WEB → règles métier (validation d'un voyage, construction du .ics)
WEB → logique de scraping dupliquée
WEB → sous-processus vers la CLI (adapters/cli/main.py, absent de ce paquet)
WEB → appel a "recuperer" depuis un serveur distant sans utilisateur local (voir §2)
```
