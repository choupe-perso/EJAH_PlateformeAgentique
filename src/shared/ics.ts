// Generation de fichiers .ics (RFC 5545), portee depuis l'ancienne
// plateforme Flask (agents/todos_transport/ics.py et
// agents/generateur_ics_sncf/ics.py - meme logique dans les deux).
//
// Heure "flottante" (sans TZID ni suffixe Z) : usage strictement personnel,
// import manuel dans l'agenda sur la meme machine/fuseau horaire.

const LARGEUR_MAX_LIGNE = 75;

export function echapperTexteIcs(texte: string): string {
  return texte
    .replace(/\\/g, "\\\\")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;")
    .replace(/\r\n/g, "\\n")
    .replace(/\n/g, "\\n");
}

export function plierLigne(ligne: string): string {
  const donnees = Buffer.byteLength(ligne, "utf-8");
  if (donnees <= LARGEUR_MAX_LIGNE) {
    return ligne;
  }

  const morceaux: string[] = [];
  let reste = ligne;
  let premiere = true;
  while (reste.length > 0) {
    const limite = premiere ? LARGEUR_MAX_LIGNE : LARGEUR_MAX_LIGNE - 1;
    let morceau = reste.slice(0, limite);
    while (Buffer.byteLength(morceau, "utf-8") > limite && morceau.length > 0) {
      morceau = morceau.slice(0, -1);
    }
    morceaux.push(morceau);
    reste = reste.slice(morceau.length);
    premiere = false;
  }
  return morceaux.join("\r\n ");
}

export function formaterDateTimeLocale(moment: Date): string {
  const pad = (n: number, len = 2) => String(n).padStart(len, "0");
  return (
    `${moment.getFullYear()}${pad(moment.getMonth() + 1)}${pad(moment.getDate())}` +
    `T${pad(moment.getHours())}${pad(moment.getMinutes())}${pad(moment.getSeconds())}`
  );
}

export function lignesValarm(description: string, declencheurIso8601: string): string[] {
  return [
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${echapperTexteIcs(description)}`,
    `TRIGGER:${declencheurIso8601}`,
    "END:VALARM",
  ];
}

export function construireCalendrier(lignesEvenements: string[]): string {
  const lignes = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//EJAH//Agents//FR",
    "CALSCALE:GREGORIAN",
    ...lignesEvenements,
    "END:VCALENDAR",
  ];
  return lignes.map(plierLigne).join("\r\n") + "\r\n";
}
