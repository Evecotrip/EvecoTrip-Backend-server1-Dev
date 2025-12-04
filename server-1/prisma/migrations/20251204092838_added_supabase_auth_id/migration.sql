/*
  Warnings:

  - A unique constraint covering the columns `[supabase_auth_id]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "supabase_auth_id" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "users_supabase_auth_id_key" ON "users"("supabase_auth_id");
