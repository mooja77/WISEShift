-- AlterTable
ALTER TABLE "CanvasTranscript" ADD COLUMN "sourceId" TEXT;
ALTER TABLE "CanvasTranscript" ADD COLUMN "sourceType" TEXT;

-- CreateTable
CREATE TABLE "CanvasShare" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "canvasId" TEXT NOT NULL,
    "shareCode" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "expiresAt" DATETIME,
    "cloneCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CanvasShare_canvasId_fkey" FOREIGN KEY ("canvasId") REFERENCES "CodingCanvas" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "CanvasShare_shareCode_key" ON "CanvasShare"("shareCode");
