# Créé par Cédric HOUPE.
# Usage ou reproduction à l'identique interdit sans autorisation.
"""Recognizers for personal data that has a fixed, checkable format.

These do not need surrounding context: the shape of the value itself is
evidence enough (a French IBAN, an IPv4 address, an email, ...).
"""
from __future__ import annotations

import re

from app.domain.entities import EntityType
from app.domain.recognizers.detection_dcp_010_interface_recognizer import flex
from app.domain.span import Span

_EMAIL_RE = re.compile(r"\b[\w.+-]+@[\w-]+\.[\w.-]+\b")
# \s (not a literal space) between groups: hard-wrapped plain text can
# legitimately word-wrap in the middle of a value, so every separator
# here needs to tolerate a "\n" standing in for a space.
_PHONE_RE = re.compile(r"\b0[1-9](?:[\s.-]?\d{2}){4}\b")
_PHONE_INTL_RE = re.compile(
    # A French number written internationally drops the leading "0" of
    # 0X XX XX XX XX, leaving a single digit before the four pairs - and
    # official/institutional documents often reinstate it as a
    # parenthesized trunk-prefix reminder ("+33 (0) 1 55 87 30 00"),
    # confirmed in a real ANSM document footer. Kept as its own
    # alternative (tried first) rather than folded into the generic
    # branch below, which has no notion of "(0)" or of a lone leading
    # digit.
    r"\+33[\s.-]?(?:\(0\)[\s.-]?)?\d(?:[\s.-]?\d{2}){4}\b"
    r"|\+\d{1,3}(?:[\s.-]?\d{2,4}){2,5}\b"
)
_IP_RE = re.compile(
    r"\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b"
)
_NIR_RE = re.compile(r"\b[12]\s\d{2}\s\d{2}\s\d{2}\s\d{3}\s\d{3}\s\d{2}\b")
_PASSPORT_RE = re.compile(r"\b\d{2}[A-Z]{2}\d{5}\b")
# Dashes are the standard French plate presentation but are sometimes
# dropped when re-typed into a form field ("GA-428-NL" then "GA428NL" for
# the exact same plate) - accept either.
_PLAQUE_RE = re.compile(r"\b[A-Z]{2}-?\d{3}-?[A-Z]{2}\b")
_IBAN_CANDIDATE_RE = re.compile(r"\bFR\d{2}(?:\s?[0-9A-Z]){20,30}\b")
_NUMERO_CLIENT_RE = re.compile(r"\bCL-\d{6,9}\b")
_HANDLE_RE = re.compile(r"(?<!\w)@[A-Za-z0-9_]{3,30}\b")
_SIRET_RE = re.compile(r"\bSIRET\s+\d{3}\s?\d{3}\s?\d{3}\s?\d{5}\b")
# Generic dash-separated reference/tracking/policy/file number: a huge
# variety of domains (patient file, insurance policy, loan, hotel
# booking, delivery tracking, ...) all use some flavor of
# "<2-6 letters>-<alphanumeric>[-<alphanumeric>]", too open-ended to
# enumerate one prefix at a time.
_REFERENCE_CODE_RE = re.compile(r"\b[A-Z]{2,6}(?:-[A-Z0-9]{1,15}){1,3}\b")
# Same idea without a dash separator (e.g. a tracking number like
# "8Y4K21LMZR" or a driving-licence number "940817B67291"): a run of
# letters+digits, at least one of each, long enough to not be a stray
# abbreviation.
_BARE_CODE_RE = re.compile(
    r"\b(?=[A-Z0-9]{6,15}\b)(?=[A-Z0-9]*[A-Z])(?=[A-Z0-9]*\d)[A-Z0-9]{6,15}\b"
)
# A currency amount immediately qualified as gross/net is a strong salary
# signal on its own, even without the word "salaire" nearby (e.g. "44 500
# euros bruts annuels") - require that qualifier so a plain price ("cet
# article coûte 45 euros") doesn't get flagged.
_SALAIRE_QUALIFIED_RE = re.compile(
    r"\b\d[\d\s]{1,9}euros?\s+(?:bruts?|nets?)(?:\s+annuels?|\s+mensuels?)?\b",
    re.IGNORECASE,
)
# A single space/tab, or a lone newline standing in for one (a
# hard-wrapped value can legitimately word-wrap mid-value - see the other
# recognizers' \s usage) - but never a real paragraph break (a blank
# line). The street-name/city groups below repeat unboundedly to swallow
# multi-word names; letting that repetition cross a paragraph break would
# eat into the *next* paragraph, and detect_only's whitespace-trim
# (engine.py) would then cut the resulting span back down and silently
# drop whatever it had swallowed there instead of leaving it for another
# recognizer to catch - e.g. dropping a city/postcode entirely rather
# than just mislabeling it.
_URL_RE = re.compile(r"\bhttps?://[^\s<>\"]+", re.IGNORECASE)
# A bare domain/website shown as plain text (no scheme, no hyperlink) -
# e.g. "ansm.sante.fr" printed in a footer. Anchored on a curated TLD list
# rather than "any word.word" to avoid false positives (decimal numbers,
# version strings like "v1.0", abbreviations like "M."): open vocabulary,
# extend as new real-world TLDs turn up. `(?<!@)` keeps this from
# double-flagging the domain half of an address _EMAIL_RE already caught.
_DOMAIN_TLDS = r"fr|com|org|net|eu|info|io|gov|biz|co|edu"
_DOMAIN_RE = re.compile(
    r"(?<!@)\b(?:www\.)?[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?"
    r"(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)*"
    rf"\.(?:{_DOMAIN_TLDS})\b",
    re.IGNORECASE,
)
_ADDR_WS = r"(?:[ \t]|\n(?![ \t]*\n))"
_ADRESSE_RE = re.compile(
    # A building can span two street numbers ("143/147", "143-147") -
    # confirmed in real institutional letterheads (e.g. ANSM's own
    # address, "143/147 boulevard Anatole France").
    r"\b\d{1,4}(?:" + _ADDR_WS + r"*[/-]" + _ADDR_WS + r"*\d{1,4})?"
    r"(?:" + _ADDR_WS + r"+bis|" + _ADDR_WS + r"+ter)?" + _ADDR_WS + r"*,?" + _ADDR_WS + r"+"
    r"(?:rue|avenue|quai|boulevard|all[ée]e|impasse|chemin|place)" + _ADDR_WS + r"+"
    r"(?:d[eu]s?" + _ADDR_WS + r"+|de" + _ADDR_WS + r"+la" + _ADDR_WS + r"+|l['’]" + _ADDR_WS + r"*)?"
    r"[A-ZÀ-Ý][\wÀ-ÿ'’\-]*(?:" + _ADDR_WS + r"+[A-ZÀ-Ý][\wÀ-ÿ'’\-]*)*"
    # The postal code is sometimes prefixed "F-" (ISO country code, as
    # used on official/EU letterheads) instead of the bare 5 digits.
    r"(?:," + _ADDR_WS + r"*F?-?" + _ADDR_WS + r"*\d{5}" + _ADDR_WS + r"+[A-ZÀ-Ý][\wÀ-ÿ\-]*)?"
)
# A password has no fixed format, but one written down and quoted (French
# guillemets or straight quotes) with a mix of letters, digits and a
# special character is distinctive enough to flag on shape alone, without
# needing a "mot de passe" trigger word nearby - useful for a second
# value described only as "une variante" of an already-mentioned password.
_PASSWORD_RE = re.compile(
    r'[«"]\s*(?P<val>(?=[^\s«»"]*[A-Za-z])(?=[^\s«»"]*\d)(?=[^\s«»"]*[!@#$%^&*+=/_-])'
    r'[^\s«»"]{8,40})\s*[»"]'
)
_BANQUE_RE = re.compile(
    flex(
        r"\b(?:Cr[ée]dit Agricole(?:\s+[A-ZÀ-Ý][\wÀ-ÿ]*)*|BNP Paribas|"
        r"Soci[ée]t[ée] G[ée]n[ée]rale|LCL|Banque Populaire(?:\s+[A-ZÀ-Ý][\wÀ-ÿ]*)*|"
        r"Caisse d['’]Épargne|CIC|La Banque Postale|HSBC|Cr[ée]dit Mutuel)\b"
    )
)


def _iban_is_valid(raw: str) -> bool:
    """ISO 7064 mod-97-10 checksum used by all IBANs."""
    compact = re.sub(r"\s", "", raw).upper()
    if not (15 <= len(compact) <= 34):
        return False
    rearranged = compact[4:] + compact[:4]
    digits = "".join(
        str(int(ch, 36)) for ch in rearranged
    )  # letters -> 10-35
    return int(digits) % 97 == 1


class RegexRecognizer:
    """Runs a fixed list of format-based patterns over the text."""

    name = "regex"

    def find(self, text: str) -> list[Span]:
        spans: list[Span] = []

        for m in _EMAIL_RE.finditer(text):
            spans.append(self._span(m, EntityType.EMAIL, 0.95))
        for m in _PHONE_RE.finditer(text):
            spans.append(self._span(m, EntityType.TELEPHONE, 0.9))
        for m in _PHONE_INTL_RE.finditer(text):
            spans.append(self._span(m, EntityType.TELEPHONE, 0.85))
        for m in _IP_RE.finditer(text):
            spans.append(self._span(m, EntityType.IP, 0.85))
        for m in _NIR_RE.finditer(text):
            spans.append(self._span(m, EntityType.NIR, 0.97))
        for m in _PASSPORT_RE.finditer(text):
            spans.append(self._span(m, EntityType.PASSEPORT, 0.85))
        for m in _PLAQUE_RE.finditer(text):
            spans.append(self._span(m, EntityType.PLAQUE, 0.9))
        for m in _PASSWORD_RE.finditer(text):
            start, end = m.span("val")
            spans.append(Span(start, end, m.group("val"), EntityType.MOT_DE_PASSE, 0.85, self.name))
        for m in _NUMERO_CLIENT_RE.finditer(text):
            spans.append(self._span(m, EntityType.NUMERO_CLIENT, 0.85))
        for m in _HANDLE_RE.finditer(text):
            spans.append(self._span(m, EntityType.RESEAU_SOCIAL, 0.8))
        for m in _URL_RE.finditer(text):
            # The greedy [^\s]+ body grabs trailing sentence punctuation
            # too (e.g. the "." ending "...actualites.") - trim it back
            # off rather than exclude those characters from the class
            # outright, since they're also legal mid-URL (query strings,
            # anchors).
            value = m.group(0).rstrip(".,;:!?)]}'\"")
            start = m.start()
            end = start + len(value)
            spans.append(Span(start, end, value, EntityType.SITE_WEB, 0.9, self.name))
        for m in _DOMAIN_RE.finditer(text):
            spans.append(self._span(m, EntityType.SITE_WEB, 0.75))
        for m in _ADRESSE_RE.finditer(text):
            spans.append(self._span(m, EntityType.ADRESSE, 0.85))
        for m in _BANQUE_RE.finditer(text):
            spans.append(self._span(m, EntityType.BANQUE, 0.8))
        for m in _SIRET_RE.finditer(text):
            spans.append(self._span(m, EntityType.SIRET, 0.9))
        for m in _REFERENCE_CODE_RE.finditer(text):
            # Above the NER recognizer's 0.7 baseline: spaCy has been
            # observed to grab these same codes as a (wrong-category,
            # sometimes truncated) PERSONNE/LIEU/ORG guess, which would
            # otherwise win the overlap and hide this more specific,
            # better-bounded match.
            spans.append(self._span(m, EntityType.NUMERO_REFERENCE, 0.75))
        for m in _BARE_CODE_RE.finditer(text):
            spans.append(self._span(m, EntityType.NUMERO_REFERENCE, 0.72))
        for m in _SALAIRE_QUALIFIED_RE.finditer(text):
            spans.append(self._span(m, EntityType.SALAIRE, 0.8))
        for m in _IBAN_CANDIDATE_RE.finditer(text):
            # trim a trailing space the greedy pattern may have grabbed
            value = m.group(0).rstrip()
            start = m.start()
            end = start + len(value)
            # Real IBANs satisfy the mod-97 checksum; test/fictional data in
            # documents often doesn't, so treat it as a confidence booster
            # rather than a hard requirement (we'd rather over-detect than
            # silently skip a badly-formed but obviously-an-IBAN value).
            score = 0.98 if _iban_is_valid(value) else 0.85
            spans.append(Span(start, end, text[start:end], EntityType.IBAN, score, self.name))

        return spans

    def _span(self, m: re.Match, entity_type: EntityType, score: float) -> Span:
        return Span(m.start(), m.end(), m.group(0), entity_type, score, self.name)
