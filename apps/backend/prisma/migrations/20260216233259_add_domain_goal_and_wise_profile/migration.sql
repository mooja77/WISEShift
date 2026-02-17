-- CreateTable
CREATE TABLE "DomainGoal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organisationId" TEXT NOT NULL,
    "domainKey" TEXT NOT NULL,
    "targetScore" REAL NOT NULL,
    "targetDate" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DomainGoal_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WISEProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organisationId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "bio" TEXT,
    "logoUrl" TEXT,
    "website" TEXT,
    "socialLinks" TEXT,
    "foundingYear" INTEGER,
    "targetPopulations" TEXT,
    "sectors" TEXT,
    "country" TEXT,
    "region" TEXT,
    "maturitySummary" TEXT,
    "strengths" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WISEProfile_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "DomainGoal_organisationId_domainKey_key" ON "DomainGoal"("organisationId", "domainKey");

-- CreateIndex
CREATE UNIQUE INDEX "WISEProfile_organisationId_key" ON "WISEProfile"("organisationId");

-- CreateIndex
CREATE UNIQUE INDEX "WISEProfile_slug_key" ON "WISEProfile"("slug");
