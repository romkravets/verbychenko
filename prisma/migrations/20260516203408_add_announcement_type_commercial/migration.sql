-- CreateEnum
CREATE TYPE "AnnouncementType" AS ENUM ('DATING', 'COMMERCIAL');

-- AlterTable
ALTER TABLE "announcements" ADD COLUMN     "contactPhone" TEXT,
ADD COLUMN     "itemTitle" TEXT,
ADD COLUMN     "price" TEXT,
ADD COLUMN     "type" "AnnouncementType" NOT NULL DEFAULT 'DATING',
ALTER COLUMN "age" SET DEFAULT 0,
ALTER COLUMN "about" SET DEFAULT '',
ALTER COLUMN "lookingFor" SET DEFAULT '';
