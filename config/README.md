# config/

**Responsabilite cible** : modeles declaratifs de configuration
(`.env.*.example`) et validation future des variables d'environnement.

**Exclusion essentielle** : aucun secret reel (voir `.gitignore`) et aucune
logique metier ici - uniquement des cles et, a terme, leur schema de
validation.

Les fichiers `.env.local` reels (avec valeurs) vivent a la racine de
chaque worktree, jamais ici, jamais suivis par git.
