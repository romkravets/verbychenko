-- CreateEnum
CREATE TYPE "AnnouncementStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "EpisodeStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'AIRED');

-- CreateEnum
CREATE TYPE "QueueType" AS ENUM ('MUSIC', 'ANNOUNCEMENT', 'EDITORIAL', 'INTRO', 'OUTRO');

-- CreateTable
CREATE TABLE "announcements" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "city" TEXT NOT NULL,
    "height" INTEGER,
    "weight" INTEGER,
    "hairColor" TEXT,
    "education" TEXT,
    "housing" TEXT,
    "about" TEXT NOT NULL,
    "lookingFor" TEXT NOT NULL,
    "aiText" TEXT,
    "status" "AnnouncementStatus" NOT NULL DEFAULT 'PENDING',
    "audioUrl" TEXT,
    "letterNumber" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "episodes" (
    "id" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" "EpisodeStatus" NOT NULL DEFAULT 'DRAFT',
    "mp3Url" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "episodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "queue_items" (
    "id" TEXT NOT NULL,
    "type" "QueueType" NOT NULL,
    "audioUrl" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "playedAt" TIMESTAMP(3),
    "episodeId" TEXT NOT NULL,
    "announcementId" TEXT,

    CONSTRAINT "queue_items_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "queue_items" ADD CONSTRAINT "queue_items_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "episodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queue_items" ADD CONSTRAINT "queue_items_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "announcements"("id") ON DELETE SET NULL ON UPDATE CASCADE;
