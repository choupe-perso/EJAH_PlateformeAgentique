// Constante partagee entre Field.tsx (client) et FieldLegend.tsx (serveur).
// Doit rester dans un module SANS "use client" : un module client ne peut
// exposer que des composants comme references client valides - y exporter
// une constante et l'importer depuis un composant serveur (FieldLegend)
// provoque une erreur du bundler RSC ("Could not find the module ... in
// the React Client Manifest").
export const FIELD_FAMILY_COLOR = {
  user: "#FF6A00",
  platform: "var(--util-ink)",
} as const;
