-- CreateEnum
CREATE TYPE "RunMode" AS ENUM ('WEBHOOK', 'CHIP_TEST');

-- AlterTable
ALTER TABLE "simulation_runs" ADD COLUMN "mode" "RunMode" NOT NULL DEFAULT 'WEBHOOK';
ALTER TABLE "simulation_runs" ADD COLUMN "chipTestConfig" JSONB;
