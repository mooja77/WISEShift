-- CreateTable
CREATE TABLE "CodingLayer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dashboardAccessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CodingLayer_dashboardAccessId_fkey" FOREIGN KEY ("dashboardAccessId") REFERENCES "DashboardAccess" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LayerHighlight" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "codingLayerId" TEXT NOT NULL,
    "responseId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "startOffset" INTEGER NOT NULL,
    "endOffset" INTEGER NOT NULL,
    "highlightedText" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LayerHighlight_codingLayerId_fkey" FOREIGN KEY ("codingLayerId") REFERENCES "CodingLayer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LayerHighlight_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "Response" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LayerHighlight_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "ResearchTag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LayerShare" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "codingLayerId" TEXT NOT NULL,
    "sharedWithId" TEXT NOT NULL,
    "permission" TEXT NOT NULL DEFAULT 'read',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LayerShare_codingLayerId_fkey" FOREIGN KEY ("codingLayerId") REFERENCES "CodingLayer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LayerShare_sharedWithId_fkey" FOREIGN KEY ("sharedWithId") REFERENCES "DashboardAccess" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ActionPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assessmentId" TEXT NOT NULL,
    "domainKey" TEXT NOT NULL,
    "domainName" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "recommendation" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "effort" TEXT NOT NULL,
    "impact" TEXT NOT NULL,
    "timeframe" TEXT NOT NULL,
    "currentLevel" TEXT NOT NULL,
    "targetLevel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'not_started',
    "notes" TEXT,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActionPlan_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ActionPlan" ("assessmentId", "createdAt", "currentLevel", "description", "domainKey", "domainName", "effort", "id", "impact", "priority", "recommendation", "targetLevel", "timeframe") SELECT "assessmentId", "createdAt", "currentLevel", "description", "domainKey", "domainName", "effort", "id", "impact", "priority", "recommendation", "targetLevel", "timeframe" FROM "ActionPlan";
DROP TABLE "ActionPlan";
ALTER TABLE "new_ActionPlan" RENAME TO "ActionPlan";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "CodingLayer_dashboardAccessId_name_key" ON "CodingLayer"("dashboardAccessId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "LayerShare_codingLayerId_sharedWithId_key" ON "LayerShare"("codingLayerId", "sharedWithId");
