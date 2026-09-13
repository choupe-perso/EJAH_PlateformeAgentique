# EJAH - Ecosysteme de Jonction et d'Assistance Humaine

Plateforme agentique personnelle, locale d'abord, structuree autour de deux
univers : **Cockpit** (indicateurs de pilotage) et **Agents** (outils et
agents specialises).

Les regles de gouvernance completes (environnements, git, base de donnees,
regles imperatives) sont dans [CLAUDE.md](./CLAUDE.md). Le detail
d'architecture technique est dans [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).

## Demarrage rapide (une fois Node.js installe)

```bash
npm install
cp config/.env.dev.example .env.local   # puis completer les valeurs reelles
npm run dev
```

Ce worktree (`PlateformeIA_EJAH/`) est l'environnement **DEV** (port 3000).
Les environnements TEST et PROD vivent dans des worktrees freres :
`PlateformeIA_EJAH-test/` et `PlateformeIA_EJAH-prod/`.

## Statut

Socle uniquement (2026-09-13). Aucune fonctionnalite Cockpit ou Agents n'est
encore implementee.
