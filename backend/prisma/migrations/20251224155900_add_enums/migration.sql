/*
  Warnings:

  - Made the column `currency` on table `Account` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "currency" AS ENUM ('KES', 'USD', 'EUR', 'CAD', 'TSH', 'UGX', 'GBP', 'ZWD');

-- CreateEnum
CREATE TYPE "account_type" AS ENUM ('checking', 'savings', 'credit', 'cash', 'investment');

-- CreateEnum
CREATE TYPE "period" AS ENUM ('monthly', 'weekly', 'yearly');

-- CreateEnum
CREATE TYPE "source" AS ENUM ('manual', 'plaid', 'import');

-- AlterTable
ALTER TABLE "Account" ALTER COLUMN "currency" SET NOT NULL,
ALTER COLUMN "currency" SET DEFAULT 'USD';
