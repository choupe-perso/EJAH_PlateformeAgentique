-- CreateEnum
CREATE TYPE "TodoTransportType" AS ENUM ('rdv', 'email', 'prompt');

-- CreateEnum
CREATE TYPE "TodoTransportStatut" AS ENUM ('active', 'archivee');

-- CreateTable
CREATE TABLE "action_history" (
    "id" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "universe" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "payload" JSONB,
    "createdBy" TEXT,

    CONSTRAINT "action_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deployment_history" (
    "id" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "environment" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "gitTag" TEXT,
    "gitBranch" TEXT NOT NULL,
    "validatedBy" TEXT,
    "notes" TEXT,

    CONSTRAINT "deployment_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_item" (
    "id" TEXT NOT NULL,
    "universe" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "icon" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "parentId" TEXT,

    CONSTRAINT "menu_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "todos_transport" (
    "id" TEXT NOT NULL,
    "type" "TodoTransportType" NOT NULL,
    "titre" TEXT NOT NULL,
    "statut" "TodoTransportStatut" NOT NULL DEFAULT 'active',
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "traite_le" TIMESTAMP(3),
    "rdv_date_debut" TIMESTAMP(6),
    "rdv_duree_minutes" INTEGER,
    "rdv_alerte_minutes" INTEGER,
    "rdv_description" TEXT,
    "email_destinataire" TEXT,
    "email_notes_brutes" TEXT,
    "email_texte" TEXT,
    "prompt_ia" TEXT,
    "prompt_projet" TEXT,
    "prompt_notes_brutes" TEXT,
    "prompt_texte" TEXT,

    CONSTRAINT "todos_transport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "action_history_occurredAt_idx" ON "action_history"("occurredAt");

-- CreateIndex
CREATE INDEX "action_history_universe_idx" ON "action_history"("universe");

-- CreateIndex
CREATE INDEX "deployment_history_occurredAt_idx" ON "deployment_history"("occurredAt");

-- CreateIndex
CREATE INDEX "deployment_history_environment_idx" ON "deployment_history"("environment");

-- CreateIndex
CREATE INDEX "menu_item_universe_idx" ON "menu_item"("universe");

-- CreateIndex
CREATE INDEX "todos_transport_statut_idx" ON "todos_transport"("statut");

-- CreateIndex
CREATE INDEX "todos_transport_type_idx" ON "todos_transport"("type");

-- AddForeignKey
ALTER TABLE "menu_item" ADD CONSTRAINT "menu_item_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "menu_item"("id") ON DELETE SET NULL ON UPDATE CASCADE;
