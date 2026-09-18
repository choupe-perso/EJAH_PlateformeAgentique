-- CreateEnum
CREATE TYPE "VeilleMoteur" AS ENUM ('ollama', 'gemini', 'chatgpt');

-- CreateEnum
CREATE TYPE "VeilleSujetEtat" AS ENUM ('actif', 'suspendu');

-- CreateEnum
CREATE TYPE "VeilleSourceCategorie" AS ENUM ('officielle', 'reseau_social', 'ecommerce');

-- CreateEnum
CREATE TYPE "VeilleSourceOrigine" AS ENUM ('ia', 'utilisateur');

-- CreateEnum
CREATE TYPE "VeilleExecutionType" AS ENUM ('globale', 'individuelle');

-- CreateEnum
CREATE TYPE "VeilleDeclencheur" AS ENUM ('manuel', 'externe');

-- CreateEnum
CREATE TYPE "VeilleExecutionStatut" AS ENUM ('en_cours', 'reussi', 'partiel', 'echoue');

-- CreateEnum
CREATE TYPE "VeilleCollecteStatut" AS ENUM ('ok', 'echec');

-- CreateEnum
CREATE TYPE "VeilleEvenementStatut" AS ENUM ('nouveau', 'modifie', 'connu');

-- CreateTable
CREATE TABLE "veille_sujet" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "objectif" TEXT NOT NULL,
    "etat" "VeilleSujetEtat" NOT NULL DEFAULT 'actif',
    "moteur_dialogue" "VeilleMoteur" NOT NULL,
    "moteur_analyse" "VeilleMoteur" NOT NULL,
    "evenements_recherches" JSONB NOT NULL,
    "criteres_inclusion" JSONB,
    "criteres_exclusion" JSONB,
    "zone_geographique" TEXT,
    "categories_sources" JSONB NOT NULL,
    "informations_a_extraire" JSONB NOT NULL,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cree_par" TEXT,
    "derniere_execution_reussie_at" TIMESTAMP(3),
    "derniere_tentative_at" TIMESTAMP(3),
    "derniere_nouveaute_at" TIMESTAMP(3),

    CONSTRAINT "veille_sujet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "veille_source" (
    "id" TEXT NOT NULL,
    "sujet_id" TEXT NOT NULL,
    "categorie" "VeilleSourceCategorie" NOT NULL,
    "libelle" TEXT NOT NULL,
    "url" TEXT,
    "propose_par" "VeilleSourceOrigine" NOT NULL,
    "valide" BOOLEAN NOT NULL DEFAULT false,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "veille_source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "veille_execution" (
    "id" TEXT NOT NULL,
    "type" "VeilleExecutionType" NOT NULL,
    "declencheur" "VeilleDeclencheur" NOT NULL,
    "demarree_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "terminee_at" TIMESTAMP(3),
    "statut" "VeilleExecutionStatut" NOT NULL DEFAULT 'en_cours',

    CONSTRAINT "veille_execution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "veille_execution_sujet" (
    "id" TEXT NOT NULL,
    "execution_id" TEXT NOT NULL,
    "sujet_id" TEXT NOT NULL,
    "statut" "VeilleExecutionStatut" NOT NULL,
    "fenetre_depuis" TIMESTAMP(3),
    "fenetre_jusqua" TIMESTAMP(3) NOT NULL,
    "erreur" TEXT,
    "nb_nouveautes" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "veille_execution_sujet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "veille_collecte" (
    "id" TEXT NOT NULL,
    "execution_sujet_id" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "contenu_brut" TEXT,
    "recupere_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "statut" "VeilleCollecteStatut" NOT NULL,
    "erreur" TEXT,

    CONSTRAINT "veille_collecte_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "veille_observation" (
    "id" TEXT NOT NULL,
    "collecte_id" TEXT NOT NULL,
    "donnees_extraites" JSONB NOT NULL,
    "pertinente" BOOLEAN NOT NULL DEFAULT false,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "evenement_id" TEXT,

    CONSTRAINT "veille_observation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "veille_evenement" (
    "id" TEXT NOT NULL,
    "sujet_id" TEXT NOT NULL,
    "cle_dedup" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "resume" TEXT NOT NULL,
    "statut" "VeilleEvenementStatut" NOT NULL,
    "donnees" JSONB NOT NULL,
    "premiere_detection_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "derniere_detection_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lu" BOOLEAN NOT NULL DEFAULT false,
    "lu_at" TIMESTAMP(3),

    CONSTRAINT "veille_evenement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "veille_evenement_version" (
    "id" TEXT NOT NULL,
    "evenement_id" TEXT NOT NULL,
    "donnees_avant" JSONB,
    "donnees_apres" JSONB NOT NULL,
    "detecte_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "veille_evenement_version_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "veille_sujet_etat_idx" ON "veille_sujet"("etat");

-- CreateIndex
CREATE INDEX "veille_source_sujet_id_idx" ON "veille_source"("sujet_id");

-- CreateIndex
CREATE INDEX "veille_execution_demarree_at_idx" ON "veille_execution"("demarree_at");

-- CreateIndex
CREATE INDEX "veille_execution_sujet_sujet_id_idx" ON "veille_execution_sujet"("sujet_id");

-- CreateIndex
CREATE INDEX "veille_execution_sujet_execution_id_idx" ON "veille_execution_sujet"("execution_id");

-- CreateIndex
CREATE INDEX "veille_collecte_execution_sujet_id_idx" ON "veille_collecte"("execution_sujet_id");

-- CreateIndex
CREATE INDEX "veille_collecte_source_id_idx" ON "veille_collecte"("source_id");

-- CreateIndex
CREATE INDEX "veille_observation_collecte_id_idx" ON "veille_observation"("collecte_id");

-- CreateIndex
CREATE INDEX "veille_observation_evenement_id_idx" ON "veille_observation"("evenement_id");

-- CreateIndex
CREATE INDEX "veille_evenement_sujet_id_idx" ON "veille_evenement"("sujet_id");

-- CreateIndex
CREATE INDEX "veille_evenement_statut_idx" ON "veille_evenement"("statut");

-- CreateIndex
CREATE INDEX "veille_evenement_lu_idx" ON "veille_evenement"("lu");

-- CreateIndex
CREATE UNIQUE INDEX "veille_evenement_sujet_id_cle_dedup_key" ON "veille_evenement"("sujet_id", "cle_dedup");

-- CreateIndex
CREATE INDEX "veille_evenement_version_evenement_id_idx" ON "veille_evenement_version"("evenement_id");

-- AddForeignKey
ALTER TABLE "veille_source" ADD CONSTRAINT "veille_source_sujet_id_fkey" FOREIGN KEY ("sujet_id") REFERENCES "veille_sujet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "veille_execution_sujet" ADD CONSTRAINT "veille_execution_sujet_execution_id_fkey" FOREIGN KEY ("execution_id") REFERENCES "veille_execution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "veille_execution_sujet" ADD CONSTRAINT "veille_execution_sujet_sujet_id_fkey" FOREIGN KEY ("sujet_id") REFERENCES "veille_sujet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "veille_collecte" ADD CONSTRAINT "veille_collecte_execution_sujet_id_fkey" FOREIGN KEY ("execution_sujet_id") REFERENCES "veille_execution_sujet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "veille_collecte" ADD CONSTRAINT "veille_collecte_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "veille_source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "veille_observation" ADD CONSTRAINT "veille_observation_collecte_id_fkey" FOREIGN KEY ("collecte_id") REFERENCES "veille_collecte"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "veille_observation" ADD CONSTRAINT "veille_observation_evenement_id_fkey" FOREIGN KEY ("evenement_id") REFERENCES "veille_evenement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "veille_evenement" ADD CONSTRAINT "veille_evenement_sujet_id_fkey" FOREIGN KEY ("sujet_id") REFERENCES "veille_sujet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "veille_evenement_version" ADD CONSTRAINT "veille_evenement_version_evenement_id_fkey" FOREIGN KEY ("evenement_id") REFERENCES "veille_evenement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
