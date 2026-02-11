/*
  Warnings:

  - You are about to drop the column `desired_position` on the `job_applications` table. All the data in the column will be lost.
  - The `availability` column on the `job_applications` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `address` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `availability` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `current_situation` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `department_id` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `education_level` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `must_change_password` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `target_position` on the `users` table. All the data in the column will be lost.
  - Added the required column `target_position` to the `job_applications` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_department_id_fkey";

-- AlterTable
ALTER TABLE "job_applications" DROP COLUMN "desired_position",
ADD COLUMN     "target_position" VARCHAR(100) NOT NULL,
DROP COLUMN "availability",
ADD COLUMN     "availability" DATE;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "address",
DROP COLUMN "availability",
DROP COLUMN "current_situation",
DROP COLUMN "department_id",
DROP COLUMN "education_level",
DROP COLUMN "must_change_password",
DROP COLUMN "target_position";

-- DropEnum
DROP TYPE "Availability";
