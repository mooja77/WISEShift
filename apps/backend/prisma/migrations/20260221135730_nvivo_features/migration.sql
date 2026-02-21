-- AlterTable
ALTER TABLE "CanvasTextCoding" ADD COLUMN "annotation" TEXT;

-- CreateTable
CREATE TABLE "CanvasCase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "canvasId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "attributes" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CanvasCase_canvasId_fkey" FOREIGN KEY ("canvasId") REFERENCES "CodingCanvas" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CanvasRelation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "canvasId" TEXT NOT NULL,
    "fromType" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "toType" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CanvasRelation_canvasId_fkey" FOREIGN KEY ("canvasId") REFERENCES "CodingCanvas" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CanvasComputedNode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "canvasId" TEXT NOT NULL,
    "nodeType" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "config" TEXT NOT NULL DEFAULT '{}',
    "result" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CanvasComputedNode_canvasId_fkey" FOREIGN KEY ("canvasId") REFERENCES "CodingCanvas" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CanvasQuestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "canvasId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#3B82F6',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "parentQuestionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CanvasQuestion_canvasId_fkey" FOREIGN KEY ("canvasId") REFERENCES "CodingCanvas" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CanvasQuestion_parentQuestionId_fkey" FOREIGN KEY ("parentQuestionId") REFERENCES "CanvasQuestion" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_CanvasQuestion" ("canvasId", "color", "createdAt", "id", "sortOrder", "text", "updatedAt") SELECT "canvasId", "color", "createdAt", "id", "sortOrder", "text", "updatedAt" FROM "CanvasQuestion";
DROP TABLE "CanvasQuestion";
ALTER TABLE "new_CanvasQuestion" RENAME TO "CanvasQuestion";
CREATE TABLE "new_CanvasTranscript" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "canvasId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "caseId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CanvasTranscript_canvasId_fkey" FOREIGN KEY ("canvasId") REFERENCES "CodingCanvas" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CanvasTranscript_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "CanvasCase" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_CanvasTranscript" ("canvasId", "content", "createdAt", "id", "sortOrder", "title", "updatedAt") SELECT "canvasId", "content", "createdAt", "id", "sortOrder", "title", "updatedAt" FROM "CanvasTranscript";
DROP TABLE "CanvasTranscript";
ALTER TABLE "new_CanvasTranscript" RENAME TO "CanvasTranscript";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "CanvasCase_canvasId_name_key" ON "CanvasCase"("canvasId", "name");
