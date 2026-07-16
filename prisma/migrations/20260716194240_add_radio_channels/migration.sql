-- CreateEnum
CREATE TYPE "ChannelCountry" AS ENUM ('UA', 'WORLD');

-- CreateTable
CREATE TABLE "radio_channels" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "emoji" TEXT NOT NULL DEFAULT '🎵',
    "description" TEXT NOT NULL DEFAULT '',
    "country" "ChannelCountry" NOT NULL DEFAULT 'UA',
    "playlistIds" TEXT[],
    "videoIds" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "radio_channels_pkey" PRIMARY KEY ("id")
);
