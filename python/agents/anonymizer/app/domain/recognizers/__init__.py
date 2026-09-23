# Créé par Cédric HOUPE.
# Usage ou reproduction à l'identique interdit sans autorisation.
from app.domain.recognizers.detection_dcp_010_interface_recognizer import Recognizer
from app.domain.recognizers.detection_dcp_020_regex_structurees import RegexRecognizer
from app.domain.recognizers.detection_dcp_030_contexte_libelle import ContextRecognizer
from app.domain.recognizers.detection_dcp_040_dictionnaire_sensible import (
    SensitiveDictionaryRecognizer,
)
from app.domain.recognizers.detection_dcp_045_organismes_institutionnels import (
    OrganismeRecognizer,
)
from app.domain.recognizers.detection_dcp_050_ner_spacy import NerRecognizer
from app.domain.recognizers.detection_dcp_055_prenoms_courants import FirstNameRecognizer
from app.domain.recognizers.detection_dcp_060_fusion_chevauchements import merge_spans


def default_recognizers() -> list[Recognizer]:
    return [
        RegexRecognizer(),
        ContextRecognizer(),
        SensitiveDictionaryRecognizer(),
        OrganismeRecognizer(),
        NerRecognizer(),
        FirstNameRecognizer(),
    ]


__all__ = [
    "Recognizer",
    "RegexRecognizer",
    "ContextRecognizer",
    "NerRecognizer",
    "SensitiveDictionaryRecognizer",
    "OrganismeRecognizer",
    "FirstNameRecognizer",
    "default_recognizers",
    "merge_spans",
]
