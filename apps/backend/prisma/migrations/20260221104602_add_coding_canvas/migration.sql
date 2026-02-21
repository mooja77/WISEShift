-- CreateTable
CREATE TABLE "CodingCanvas" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dashboardAccessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CodingCanvas_dashboardAccessId_fkey" FOREIGN KEY ("dashboardAccessId") REFERENCES "DashboardAccess" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CanvasTranscript" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "canvasId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CanvasTranscript_canvasId_fkey" FOREIGN KEY ("canvasId") REFERENCES "CodingCanvas" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CanvasQuestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "canvasId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#3B82F6',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CanvasQuestion_canvasId_fkey" FOREIGN KEY ("canvasId") REFERENCES "CodingCanvas" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CanvasMemo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "canvasId" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#FEF08A',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CanvasMemo_canvasId_fkey" FOREIGN KEY ("canvasId") REFERENCES "CodingCanvas" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CanvasTextCoding" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "canvasId" TEXT NOT NULL,
    "transcriptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "startOffset" INTEGER NOT NULL,
    "endOffset" INTEGER NOT NULL,
    "codedText" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CanvasTextCoding_canvasId_fkey" FOREIGN KEY ("canvasId") REFERENCES "CodingCanvas" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CanvasTextCoding_transcriptId_fkey" FOREIGN KEY ("transcriptId") REFERENCES "CanvasTranscript" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CanvasTextCoding_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "CanvasQuestion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CanvasNodePosition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "canvasId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "nodeType" TEXT NOT NULL,
    "x" REAL NOT NULL,
    "y" REAL NOT NULL,
    "width" REAL,
    "height" REAL,
    CONSTRAINT "CanvasNodePosition_canvasId_fkey" FOREIGN KEY ("canvasId") REFERENCES "CodingCanvas" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "CodingCanvas_dashboardAccessId_name_key" ON "CodingCanvas"("dashboardAccessId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "CanvasNodePosition_canvasId_nodeId_key" ON "CanvasNodePosition"("canvasId", "nodeId");
