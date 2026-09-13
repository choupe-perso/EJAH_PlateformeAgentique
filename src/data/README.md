# data/

**Responsabilite cible** : adaptateurs de persistance (ex : `db.ts`, client
Prisma).

**Exclusion essentielle** : aucune donnee PostgreSQL reelle ni logique
metier ici - uniquement l'acces technique aux donnees, appele par `core/`.

Le schema Prisma (`prisma/schema.prisma`) reste a la racine du depot :
emplacement impose par l'outillage Prisma, pas un choix d'architecture.
