-- CreateTable
CREATE TABLE "ResearchTag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dashboardAccessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ResearchTag_dashboardAccessId_fkey" FOREIGN KEY ("dashboardAccessId") REFERENCES "DashboardAccess" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TextHighlight" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dashboardAccessId" TEXT NOT NULL,
    "responseId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "startOffset" INTEGER NOT NULL,
    "endOffset" INTEGER NOT NULL,
    "highlightedText" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TextHighlight_dashboardAccessId_fkey" FOREIGN KEY ("dashboardAccessId") REFERENCES "DashboardAccess" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TextHighlight_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "Response" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TextHighlight_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "ResearchTag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ResearchNote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dashboardAccessId" TEXT NOT NULL,
    "responseId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ResearchNote_dashboardAccessId_fkey" FOREIGN KEY ("dashboardAccessId") REFERENCES "DashboardAccess" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ResearchNote_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "Response" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QuotePin" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dashboardAccessId" TEXT NOT NULL,
    "responseId" TEXT NOT NULL,
    "quoteText" TEXT NOT NULL,
    "contextNote" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QuotePin_dashboardAccessId_fkey" FOREIGN KEY ("dashboardAccessId") REFERENCES "DashboardAccess" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "QuotePin_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "Response" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ResearchTag_dashboardAccessId_name_key" ON "ResearchTag"("dashboardAccessId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ResearchNote_dashboardAccessId_responseId_key" ON "ResearchNote"("dashboardAccessId", "responseId");
