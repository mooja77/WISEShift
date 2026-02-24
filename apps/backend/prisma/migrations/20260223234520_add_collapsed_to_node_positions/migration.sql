-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CanvasNodePosition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "canvasId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "nodeType" TEXT NOT NULL,
    "x" REAL NOT NULL,
    "y" REAL NOT NULL,
    "width" REAL,
    "height" REAL,
    "collapsed" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "CanvasNodePosition_canvasId_fkey" FOREIGN KEY ("canvasId") REFERENCES "CodingCanvas" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CanvasNodePosition" ("canvasId", "height", "id", "nodeId", "nodeType", "width", "x", "y") SELECT "canvasId", "height", "id", "nodeId", "nodeType", "width", "x", "y" FROM "CanvasNodePosition";
DROP TABLE "CanvasNodePosition";
ALTER TABLE "new_CanvasNodePosition" RENAME TO "CanvasNodePosition";
CREATE UNIQUE INDEX "CanvasNodePosition_canvasId_nodeId_key" ON "CanvasNodePosition"("canvasId", "nodeId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
