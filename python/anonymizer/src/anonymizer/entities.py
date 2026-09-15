"""Entity types the engine can detect and pseudonymize.

`SPECIAL_CATEGORY` marks entities that fall under GDPR Art. 9 (special
categories of personal data: health, religion, sexual orientation, ethnic
origin, union membership, political opinion) or Art. 10 (criminal
convictions) - useful to flag or filter separately from "ordinary" PII.
"""
from __future__ import annotations

from enum import Enum


class EntityType(str, Enum):
    PERSONNE = "PERSONNE"
    DATE_NAISSANCE = "DATE_NAISSANCE"
    LIEU_NAISSANCE = "LIEU_NAISSANCE"
    ADRESSE = "ADRESSE"
    TELEPHONE = "TELEPHONE"
    EMAIL = "EMAIL"
    NIR = "NIR"
    CNI = "CNI"
    PASSEPORT = "PASSEPORT"
    TITRE_SEJOUR = "TITRE_SEJOUR"
    IBAN = "IBAN"
    BANQUE = "BANQUE"
    PLAQUE = "PLAQUE"
    EMPLOYEUR = "EMPLOYEUR"
    POSTE = "POSTE"
    SALAIRE = "SALAIRE"
    IDENTIFIANT = "IDENTIFIANT"
    MOT_DE_PASSE = "MOT_DE_PASSE"
    IP = "IP"
    RESEAU_SOCIAL = "RESEAU_SOCIAL"
    COLIS = "COLIS"
    CARTE_BANCAIRE_PARTIELLE = "CARTE_BANCAIRE_PARTIELLE"
    NUMERO_CLIENT = "NUMERO_CLIENT"
    NUMERO_REFERENCE = "NUMERO_REFERENCE"
    PERMIS_CONDUIRE = "PERMIS_CONDUIRE"
    SIRET = "SIRET"
    SANTE = "SANTE"
    RELIGION = "RELIGION"
    ORIENTATION_SEXUELLE = "ORIENTATION_SEXUELLE"
    ORIGINE = "ORIGINE"
    SYNDICAT = "SYNDICAT"
    OPINION_POLITIQUE = "OPINION_POLITIQUE"
    CASIER_JUDICIAIRE = "CASIER_JUDICIAIRE"


SPECIAL_CATEGORY = {
    EntityType.SANTE,
    EntityType.RELIGION,
    EntityType.ORIENTATION_SEXUELLE,
    EntityType.ORIGINE,
    EntityType.SYNDICAT,
    EntityType.OPINION_POLITIQUE,
    EntityType.CASIER_JUDICIAIRE,
}


def is_special_category(entity_type: EntityType) -> bool:
    return entity_type in SPECIAL_CATEGORY


class MacroCategory(str, Enum):
    """The 5-color legend used to annotate the "Histoire_N" test corpus
    (tests/fixtures/Histoire_N_categories_couleur*.docx): each fine-grained
    EntityType belongs to exactly one macro-category, letting new stories
    be scored for recall directly from their color-coding, without having
    to hand-build a per-value category table like Format1-5/story2."""

    IDENTITE_CONTACT = "IDENTITE_CONTACT"  # 1F4E96 blue
    IDENTIFIANTS_OFFICIELS = "IDENTIFIANTS_OFFICIELS"  # C00000 red
    SANTE = "SANTE"  # 2E7D32 green
    SENSIBLE_JUDICIAIRE = "SENSIBLE_JUDICIAIRE"  # 7030A0 purple
    PRO_NUMERIQUE = "PRO_NUMERIQUE"  # E36C09 orange


MACRO_CATEGORY_BY_ENTITY: dict[EntityType, MacroCategory] = {
    EntityType.PERSONNE: MacroCategory.IDENTITE_CONTACT,
    EntityType.DATE_NAISSANCE: MacroCategory.IDENTITE_CONTACT,
    EntityType.LIEU_NAISSANCE: MacroCategory.IDENTITE_CONTACT,
    EntityType.ADRESSE: MacroCategory.IDENTITE_CONTACT,
    EntityType.TELEPHONE: MacroCategory.IDENTITE_CONTACT,
    EntityType.EMAIL: MacroCategory.IDENTITE_CONTACT,
    EntityType.NIR: MacroCategory.IDENTIFIANTS_OFFICIELS,
    EntityType.CNI: MacroCategory.IDENTIFIANTS_OFFICIELS,
    EntityType.PASSEPORT: MacroCategory.IDENTIFIANTS_OFFICIELS,
    EntityType.TITRE_SEJOUR: MacroCategory.IDENTIFIANTS_OFFICIELS,
    EntityType.IBAN: MacroCategory.IDENTIFIANTS_OFFICIELS,
    EntityType.BANQUE: MacroCategory.IDENTIFIANTS_OFFICIELS,
    EntityType.PLAQUE: MacroCategory.IDENTIFIANTS_OFFICIELS,
    EntityType.COLIS: MacroCategory.IDENTIFIANTS_OFFICIELS,
    EntityType.CARTE_BANCAIRE_PARTIELLE: MacroCategory.IDENTIFIANTS_OFFICIELS,
    EntityType.NUMERO_CLIENT: MacroCategory.IDENTIFIANTS_OFFICIELS,
    EntityType.NUMERO_REFERENCE: MacroCategory.IDENTIFIANTS_OFFICIELS,
    EntityType.PERMIS_CONDUIRE: MacroCategory.IDENTIFIANTS_OFFICIELS,
    EntityType.SIRET: MacroCategory.IDENTIFIANTS_OFFICIELS,
    EntityType.SANTE: MacroCategory.SANTE,
    EntityType.RELIGION: MacroCategory.SENSIBLE_JUDICIAIRE,
    EntityType.ORIENTATION_SEXUELLE: MacroCategory.SENSIBLE_JUDICIAIRE,
    EntityType.ORIGINE: MacroCategory.SENSIBLE_JUDICIAIRE,
    EntityType.SYNDICAT: MacroCategory.SENSIBLE_JUDICIAIRE,
    EntityType.OPINION_POLITIQUE: MacroCategory.SENSIBLE_JUDICIAIRE,
    EntityType.CASIER_JUDICIAIRE: MacroCategory.SENSIBLE_JUDICIAIRE,
    EntityType.EMPLOYEUR: MacroCategory.PRO_NUMERIQUE,
    EntityType.POSTE: MacroCategory.PRO_NUMERIQUE,
    EntityType.SALAIRE: MacroCategory.PRO_NUMERIQUE,
    EntityType.IDENTIFIANT: MacroCategory.PRO_NUMERIQUE,
    EntityType.MOT_DE_PASSE: MacroCategory.PRO_NUMERIQUE,
    EntityType.IP: MacroCategory.PRO_NUMERIQUE,
    EntityType.RESEAU_SOCIAL: MacroCategory.PRO_NUMERIQUE,
}


def macro_category(entity_type: EntityType) -> MacroCategory:
    return MACRO_CATEGORY_BY_ENTITY[entity_type]
