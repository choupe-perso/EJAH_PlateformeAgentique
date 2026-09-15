// Type partage entre l'adaptateur integrations/anonymizer et le composant UI -
// miroir de span.py (Span) et entities.py (EntityType) du moteur Python.
export type SpanAnonymisation = {
  start: number;
  end: number;
  text: string;
  entityType: string;
  score: number;
  source: string;
};
