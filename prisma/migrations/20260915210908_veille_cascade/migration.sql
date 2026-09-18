-- DropForeignKey
ALTER TABLE "veille_collecte" DROP CONSTRAINT "veille_collecte_execution_sujet_id_fkey";

-- DropForeignKey
ALTER TABLE "veille_collecte" DROP CONSTRAINT "veille_collecte_source_id_fkey";

-- DropForeignKey
ALTER TABLE "veille_evenement" DROP CONSTRAINT "veille_evenement_sujet_id_fkey";

-- DropForeignKey
ALTER TABLE "veille_evenement_version" DROP CONSTRAINT "veille_evenement_version_evenement_id_fkey";

-- DropForeignKey
ALTER TABLE "veille_execution_sujet" DROP CONSTRAINT "veille_execution_sujet_execution_id_fkey";

-- DropForeignKey
ALTER TABLE "veille_execution_sujet" DROP CONSTRAINT "veille_execution_sujet_sujet_id_fkey";

-- DropForeignKey
ALTER TABLE "veille_observation" DROP CONSTRAINT "veille_observation_collecte_id_fkey";

-- DropForeignKey
ALTER TABLE "veille_observation" DROP CONSTRAINT "veille_observation_evenement_id_fkey";

-- DropForeignKey
ALTER TABLE "veille_source" DROP CONSTRAINT "veille_source_sujet_id_fkey";

-- AddForeignKey
ALTER TABLE "veille_source" ADD CONSTRAINT "veille_source_sujet_id_fkey" FOREIGN KEY ("sujet_id") REFERENCES "veille_sujet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "veille_execution_sujet" ADD CONSTRAINT "veille_execution_sujet_execution_id_fkey" FOREIGN KEY ("execution_id") REFERENCES "veille_execution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "veille_execution_sujet" ADD CONSTRAINT "veille_execution_sujet_sujet_id_fkey" FOREIGN KEY ("sujet_id") REFERENCES "veille_sujet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "veille_collecte" ADD CONSTRAINT "veille_collecte_execution_sujet_id_fkey" FOREIGN KEY ("execution_sujet_id") REFERENCES "veille_execution_sujet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "veille_collecte" ADD CONSTRAINT "veille_collecte_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "veille_source"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "veille_observation" ADD CONSTRAINT "veille_observation_collecte_id_fkey" FOREIGN KEY ("collecte_id") REFERENCES "veille_collecte"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "veille_observation" ADD CONSTRAINT "veille_observation_evenement_id_fkey" FOREIGN KEY ("evenement_id") REFERENCES "veille_evenement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "veille_evenement" ADD CONSTRAINT "veille_evenement_sujet_id_fkey" FOREIGN KEY ("sujet_id") REFERENCES "veille_sujet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "veille_evenement_version" ADD CONSTRAINT "veille_evenement_version_evenement_id_fkey" FOREIGN KEY ("evenement_id") REFERENCES "veille_evenement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
