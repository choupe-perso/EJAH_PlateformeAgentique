# integrations/

**Responsabilite cible** : adaptateurs vers les moteurs (IA, etc.) et
systemes externes.

**Exclusion essentielle** : aucun choix autonome du moteur (le choix reste
explicite et utilisateur, voir CLAUDE.md) et aucune logique metier ici -
uniquement le contrat d'acces technique a un fournisseur donne.

- `python-agent-runtime.ts` - contrat d'acces HTTP a la gateway locale des
  agents Python (`python/gateway/`, voir `docs/ARCHITECTURE.md` section
  5bis). Generique a tous les agents Python : aucune logique propre a un
  agent en particulier, uniquement l'appel technique decrit par le
  `contract.yaml` de chacun.
