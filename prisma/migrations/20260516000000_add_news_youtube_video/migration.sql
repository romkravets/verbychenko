-- Add NEWS to QueueType enum
ALTER TYPE "QueueType" ADD VALUE IF NOT EXISTS 'NEWS';

-- Add youtubeVideoId to queue_items
ALTER TABLE "queue_items" ADD COLUMN IF NOT EXISTS "youtubeVideoId" TEXT;

-- CreateTable youtube_videos
CREATE TABLE IF NOT EXISTS "youtube_videos" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "channelName" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "radioText" TEXT NOT NULL,
    "audioUrl" TEXT,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "youtube_videos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "youtube_videos_videoId_key" ON "youtube_videos"("videoId");

-- AddForeignKey
ALTER TABLE "queue_items" ADD CONSTRAINT "queue_items_youtubeVideoId_fkey"
  FOREIGN KEY ("youtubeVideoId") REFERENCES "youtube_videos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
