from anonymizer.recognizers.detection_dcp_010_interface_recognizer import Recognizer
from anonymizer.recognizers.detection_dcp_020_regex_structurees import RegexRecognizer
from anonymizer.recognizers.detection_dcp_030_contexte_libelle import ContextRecognizer
from anonymizer.recognizers.detection_dcp_040_dictionnaire_sensible import (
    SensitiveDictionaryRecognizer,
)
from anonymizer.recognizers.detection_dcp_050_ner_spacy import NerRecognizer
from anonymizer.recognizers.detection_dcp_055_prenoms_courants import FirstNameRecognizer
from anonymizer.recognizers.detection_dcp_060_fusion_chevauchements import merge_spans


def default_recognizers() -> list[Recognizer]:
    return [
        RegexRecognizer(),
        ContextRecognizer(),
        SensitiveDictionaryRecognizer(),
        NerRecognizer(),
        FirstNameRecognizer(),
    ]


__all__ = [
    "Recognizer",
    "RegexRecognizer",
    "ContextRecognizer",
    "NerRecognizer",
    "SensitiveDictionaryRecognizer",
    "FirstNameRecognizer",
    "default_recognizers",
    "merge_spans",
]
