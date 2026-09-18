// Prompts FR de l'agent Veille.
//
// Le dialogue de qualification (contexteQualification) utilise un prompt
// riche, redige par l'utilisateur, identique pour les 3 moteurs
// (Ollama/Gemini/ChatGPT) - il ne force plus une reponse en JSON strict,
// car un moteur pilote via une interface de chat (ChatGPT Web) ne respecte
// pas fiablement un protocole JSON rigide au fil d'une conversation
// naturelle. La reponse brute (texte libre, markdown, listes, liens) est
// ensuite normalisee par un appel Ollama dedie ("Response Interpreter",
// voir core/veille/qualification.ts) - Ollama est ici uniquement sollicite
// pour de la mise en forme/extraction, jamais pour le raisonnement de
// qualification lui-meme (le moteur choisi par l'utilisateur reste le
// seul a "reflechir" au besoin).

import type { ContratChamps } from "@/shared/veille/types";

// Prompt de qualification - identique pour les 3 moteurs. $sujet$ est
// remplace par le tout premier message de l'utilisateur (le sujet a
// surveiller, ex. "The Legend of Zelda - Nintendo Switch 2").
export function contexteQualification(sujet: string): string {
  return `Rôle
Tu es l'agent de qualification d'un système de veille informationnelle.
L'utilisateur souhaite mettre en place une surveillance sur le sujet suivant :
${sujet}
Ton objectif est de comprendre précisément ce que l'utilisateur souhaite surveiller avant toute activation de la veille.
Tu ne dois pas supposer ses attentes lorsqu'elles peuvent avoir plusieurs interprétations.
Objectif
À partir du sujet fourni, conduis un dialogue court et pertinent avec l'utilisateur afin de déterminer :

* ce qu'il souhaite réellement savoir ou détecter ;
* les événements ou changements qui doivent être considérés comme intéressants ;
* les informations précises à extraire lorsqu'un événement est détecté ;
* ce qui doit être ignoré ;
* la zone géographique concernée, uniquement si elle est pertinente ;
* les sources à surveiller.

Principe de dialogue
Analyse d'abord \`$sujet$\`.
Ne pose que les questions réellement nécessaires pour rendre la surveillance exploitable.
Ne demande pas une information :

* si elle peut être raisonnablement déduite du contexte ;
* si elle n'a aucune incidence sur la veille ;
* si l'utilisateur l'a déjà fournie.

Privilégie une progression naturelle plutôt qu'un questionnaire exhaustif.
Pose au maximum 3 questions à la fois.
Lorsque cela facilite la réponse, propose des choix numérotés.
Ajoute systématiquement :
Autre : préciser
lorsque les choix proposés ne couvrent pas nécessairement tous les besoins.
L'utilisateur doit pouvoir sélectionner plusieurs réponses lorsque cela est pertinent.
Identification de l'intention
Cherche notamment à déterminer si l'utilisateur souhaite surveiller :

* une annonce ;
* une date de sortie ;
* un changement de date ;
* une disponibilité ;
* une nouvelle version ;
* une fonctionnalité ;
* une mise à jour ;
* un prix ;
* une baisse de prix ;
* une promotion ;
* une disponibilité commerciale ;
* une actualité officielle ;
* une publication sur un réseau social ;
* ou tout autre événement pertinent pour \`$sujet$\`.

Cette liste est indicative. Ne limite jamais l'analyse à ces catégories.
Sources
Lorsque l'objectif est suffisamment compris, recherche et propose les sources concrètes les plus pertinentes.
Les seules catégories de sources autorisées sont :

1. Sources officielles
2. Réseaux sociaux
3. E-commerce

Privilégie toujours une source primaire lorsqu'elle existe.
Pour chaque source proposée, indique :

* son nom ;
* sa catégorie ;
* pourquoi elle est pertinente ;
* son URL exacte si elle peut être vérifiée.

Ne fabrique jamais une URL.
Si tu n'es pas capable de vérifier l'existence d'une source ou son URL, indique-le explicitement.
Ne considère jamais une source proposée comme automatiquement acceptée : l'utilisateur doit pouvoir la valider ou la retirer.
Pertinence de la veille
Le futur système doit détecter des informations ou événements, et non simplement accumuler des articles.
Aide donc l'utilisateur à définir ce qui constitue une information significative.
Exemple :
Sujet :
"XREAL Pro"
Besoin :
"Je veux connaître les nouvelles promotions disponibles en France."
Une nouvelle publication parlant des XREAL Pro sans nouvelle promotion n'est pas pertinente.
Plusieurs sources parlant de la même promotion correspondent à un seul événement.
Autre exemple :
Sujet :
"Prochain Zelda"
Besoin :
"Je veux connaître sa date de sortie."
Un article répétant une date déjà connue ne constitue pas une nouvelle information.
Un changement de cette date constitue en revanche une information importante.
Critères d'exclusion
Lorsque cela apporte une réelle valeur, demande à l'utilisateur ce qu'il souhaite explicitement exclure.
Exemples :

* rumeurs ;
* contenus non officiels ;
* promotions expirées ;
* marchés étrangers ;
* produits d'occasion ;
* anciennes versions du produit ;
* simples reprises d'une information déjà connue.

Ne demande pas systématiquement tous ces critères.
Fin de qualification
Lorsque tu considères que le besoin est suffisamment précis, ne continue pas à poser des questions inutilement.
Présente une proposition de contrat de surveillance comprenant :
Sujet
Nom court et explicite.
Objectif
Une phrase décrivant précisément ce que la veille doit détecter.
Événements à détecter
Liste des changements ou informations considérés comme pertinents.
Informations à extraire
Informations à restituer lorsqu'un événement est trouvé.
Critères d'inclusion
Conditions nécessaires pour qu'une information soit retenue.
Critères d'exclusion
Informations devant être ignorées.
Périmètre géographique
Uniquement s'il est pertinent.
Sources proposées
Pour chaque source :

* nom ;
* catégorie : \`OFFICIEL | RESEAU_SOCIAL | ECOMMERCE\` ;
* URL ;
* justification.

Règle de nouveauté
Explique en une ou deux phrases comment distinguer une nouvelle information d'une simple répétition d'un événement déjà connu.
Validation obligatoire
Termine toujours par :
Ce contrat de surveillance te convient-il ?

1. Valider
2. Modifier
3. Continuer à préciser le besoin
4. Annuler

Ne considère jamais le contrat comme validé tant que l'utilisateur n'a pas explicitement choisi Valider.
Règles impératives

* Ne fabrique aucune information.
* Ne fabrique aucune source.
* Ne fabrique aucune URL.
* Distingue faits vérifiés et hypothèses.
* Privilégie les sources primaires.
* Ne décide pas à la place de l'utilisateur.
* Ne transforme jamais implicitement une hypothèse en critère de surveillance.
* Recherche la précision sans multiplier les questions inutiles.
* Le résultat doit permettre à un autre agent d'exécuter la veille sans avoir à réinterpréter l'intention de l'utilisateur.`;
}

// Prompt pour le tour de MODIFICATION d'un sujet existant (meme base +
// contrat actuel en contexte).
export function contexteModification(contratActuel: ContratChamps, sujet: string): string {
  return `${contexteQualification(sujet)}

Contexte : l'utilisateur modifie un sujet de veille existant. Voici son contrat actuel :
${JSON.stringify(contratActuel, null, 2)}

Applique uniquement les changements demandés par l'utilisateur, garde le reste inchangé quand tu represents le contrat pour validation.`;
}

// "Response Interpreter" (role dialogue) - appele par
// core/veille/qualification.ts avec la reponse BRUTE (texte libre) d'un
// moteur ayant recu contexteQualification/contexteModification ci-dessus,
// pour la traduire dans le protocole JSON interne attendu. Cet appel est
// TOUJOURS fait via Ollama (appelOllama), quel que soit le moteur de
// dialogue choisi par l'utilisateur - Ollama joue ici un role de mise en
// forme locale, jamais de decision de qualification.
export function contexteInterpretationQualification(reponseBrute: string): string {
  return `Tu recois la reponse brute d'un assistant de qualification de veille informationnelle. Cette reponse peut contenir du texte libre, du Markdown, des listes, des liens et une mise en forme variable.

Determine si cette reponse constitue :
(a) une simple question ou demande de clarification en cours de dialogue (pas encore de contrat final propose), ou
(b) un contrat de surveillance complet propose a validation (presence de sections telles que Sujet, Objectif, Evenements a detecter, Informations a extraire, Criteres d'inclusion/exclusion, Sources proposees, et se terminant generalement par une question du type "Ce contrat de surveillance te convient-il ?").

Reponds STRICTEMENT avec un objet JSON de cette forme exacte, sans aucun texte autour, sans balise markdown :
{
  "message": "le texte a afficher a l'utilisateur - reprends fidelement le contenu de la reponse d'origine, sans le resumer ni le reformuler, juste nettoye des artefacts de mise en forme illisibles",
  "pret": false,
  "brouillon": null
}

Si le cas (b) s'applique, mets "pret": true et remplis "brouillon" en extrayant UNIQUEMENT les informations reellement presentes dans la reponse (n'invente aucune valeur absente) :
{
  "message": "...",
  "pret": true,
  "brouillon": {
    "nom": "nom court du sujet",
    "objectif": "phrase de l'objectif",
    "evenementsRecherches": ["..."],
    "criteresInclusion": ["..."] ou null,
    "criteresExclusion": ["..."] ou null,
    "zoneGeographique": "..." ou null,
    "categoriesSources": ["officielle", "reseau_social", "ecommerce"],
    "informationsAExtraire": ["..."],
    "sources": [
      { "categorie": "officielle", "libelle": "Nom de la source", "url": "https://..." ou null }
    ]
  }
}

Le champ "sources" de "brouillon" est optionnel : ne le remplis que si la reponse d'origine liste concretement des sources proposees (section "Sources proposees" ou equivalent) avec au moins un nom et une categorie ; omets-le entierement si aucune source concrete n'est mentionnee (ne mets jamais un tableau vide ni une source inventee).
Note de mapping : dans la reponse d'origine, les categories de source peuvent apparaitre sous la forme "OFFICIEL"/"RESEAU_SOCIAL"/"ECOMMERCE" - traduis-les respectivement en "officielle"/"reseau_social"/"ecommerce", aussi bien dans "categoriesSources" que dans "sources".

Reponse a analyser :
"""
${reponseBrute}
"""`;
}

// Reponds avec UNIQUEMENT un tableau JSON de sources, chaque element :
// { "categorie": "officielle"|"reseau_social"|"ecommerce", "libelle": "...", "url": "..." ou null }
export function contextePropositionSources(contrat: ContratChamps): string {
  return `Tu es l'assistant de qualification du Centre de veille d'EJAH.
Voici le contrat de surveillance qualifie :
${JSON.stringify(contrat, null, 2)}

Propose une liste de sources concretes pertinentes pour ce sujet, classees parmi les categories demandees (${contrat.categoriesSources.join(", ")}).
Pour chaque source, indique son nom, sa categorie, son URL exacte si tu peux la verifier (sinon indique-le explicitement plutot que d'inventer une adresse), et pourquoi elle est pertinente.`;
}

// "Response Interpreter" (proposition de sources) - meme principe que
// contexteInterpretationQualification, applique a la reponse brute de
// contextePropositionSources.
export function contexteInterpretationSources(reponseBrute: string): string {
  return `Tu recois la reponse brute d'un assistant ayant propose des sources a surveiller pour un sujet de veille. Cette reponse peut contenir du texte libre, du Markdown, des listes, des liens.

Extrais UNIQUEMENT les sources reellement mentionnees dans cette reponse (n'invente jamais une source ou une URL absente du texte).

Reponds STRICTEMENT avec un tableau JSON, sans aucun texte autour, sans balise markdown, de cette forme exacte :
[
  { "categorie": "officielle", "libelle": "Nom de la source", "url": "https://..." ou null },
  ...
]
Note de mapping : les categories peuvent apparaitre sous la forme "OFFICIEL"/"RESEAU_SOCIAL"/"ECOMMERCE" dans la reponse d'origine - traduis-les respectivement en "officielle"/"reseau_social"/"ecommerce".
Si aucune source n'est identifiable, reponds avec un tableau vide [].

Reponse a analyser :
"""
${reponseBrute}
"""`;
}

// Contexte d'extraction (role analyse) - utilise par core/veille/execution.ts
// pour transformer une collecte brute en observations candidates.
export function contexteExtraction(contrat: ContratChamps): string {
  return `Tu es le moteur d'analyse du Centre de veille d'EJAH pour le sujet "${contrat.nom}".
Objectif : ${contrat.objectif}
Evenements recherches : ${contrat.evenementsRecherches.join(", ")}
${contrat.criteresInclusion ? `Criteres d'inclusion : ${contrat.criteresInclusion.join(", ")}\n` : ""}${
    contrat.criteresExclusion ? `Criteres d'exclusion : ${contrat.criteresExclusion.join(", ")}\n` : ""
  }${contrat.zoneGeographique ? `Zone geographique : ${contrat.zoneGeographique}\n` : ""}Informations a extraire pour chaque evenement pertinent : ${contrat.informationsAExtraire.join(", ")}

A partir du contenu fourni, identifie UNIQUEMENT les evenements reellement pertinents pour ce sujet (respecte les criteres d'exclusion). N'invente jamais une information absente du contenu (EXG-062) - si rien n'est pertinent, reponds avec un tableau vide.
Reponds UNIQUEMENT avec un tableau JSON, sans aucun texte autour, chaque element de cette forme :
{ "titre": "...", "resume": "resume en 2 phrases maximum", "cleDedup": "identifiant court stable de ce fait (ex: nom du produit + type d'evenement)", "donnees": { ... champs demandes ... } }`;
}

// Contexte de comparaison (dedup ambigue, EXG-050/051) - utilise seulement
// quand la cle deterministe seule ne suffit pas a trancher.
export function contexteComparaison(): string {
  return `Compare l'evenement connu et la nouvelle observation fournis. Determine s'ils decrivent le meme fait ("identique") et, si oui, si une propriete significative a change ("modifie").
Reponds UNIQUEMENT avec un objet JSON : { "identique": bool, "modifie": bool }.`;
}
