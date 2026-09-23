# Créé par Cédric HOUPE.
# Usage ou reproduction à l'identique interdit sans autorisation.
"""Core de l'agent anonymizer - indépendant de tout canal d'exposition
(CLI, Web, API, MCP). Volontairement vide : importer explicitement
app.service (façade execute()/process_one()), app.domain.* ou
app.tools.* plutôt que de tout charger via ce package, pour qu'un usage
strictement domaine (ex. tests sur Span) n'entraîne pas le chargement des
handlers de formats et de leurs dépendances lourdes (spacy, rapidocr...)."""
