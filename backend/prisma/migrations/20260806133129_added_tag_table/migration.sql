-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "tagId" INTEGER;

-- CreateTable
CREATE TABLE "Tag" (
    "id" SERIAL NOT NULL,
    "tagName" TEXT NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE SET NULL ON UPDATE CASCADE;
