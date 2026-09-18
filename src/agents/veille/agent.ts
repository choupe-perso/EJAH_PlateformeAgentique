// Descripteur de l'agent Veille - consomme uniquement par core/ (jamais
// d'acces direct a integrations/ ou data/ depuis agents/, agents/README.md).

export const agentVeille = {
  id: "veille",
  nom: "Veille",
  description:
    "Centre de veille informationnelle personnel : surveille des sujets choisis par " +
    "l'utilisateur, propose des sources, detecte les nouveautes et les changements.",
};
