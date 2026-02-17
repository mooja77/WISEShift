-- CreateTable
CREATE TABLE "ResearcherAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "institution" TEXT NOT NULL,
    "accessLevel" TEXT NOT NULL DEFAULT 'registered',
    "verificationCode" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "ethicsApproval" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DataAccessLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "researcherId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "queryParams" TEXT,
    "resultCount" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DataAccessLog_researcherId_fkey" FOREIGN KEY ("researcherId") REFERENCES "ResearcherAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorkingGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sector" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "WorkingGroupMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workingGroupId" TEXT NOT NULL,
    "accessCode" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkingGroupMember_workingGroupId_fkey" FOREIGN KEY ("workingGroupId") REFERENCES "WorkingGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorkingGroupAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workingGroupId" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "assignedBy" TEXT NOT NULL,
    "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkingGroupAssignment_workingGroupId_fkey" FOREIGN KEY ("workingGroupId") REFERENCES "WorkingGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorkingGroupAssignment_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Discussion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workingGroupId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Discussion_workingGroupId_fkey" FOREIGN KEY ("workingGroupId") REFERENCES "WorkingGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DocumentLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workingGroupId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "description" TEXT,
    "addedBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DocumentLink_workingGroupId_fkey" FOREIGN KEY ("workingGroupId") REFERENCES "WorkingGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ActivityEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workingGroupId" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "detail" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActivityEntry_workingGroupId_fkey" FOREIGN KEY ("workingGroupId") REFERENCES "WorkingGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ResearcherAccount_email_key" ON "ResearcherAccount"("email");

-- CreateIndex
CREATE UNIQUE INDEX "WorkingGroupMember_workingGroupId_accessCode_key" ON "WorkingGroupMember"("workingGroupId", "accessCode");

-- CreateIndex
CREATE UNIQUE INDEX "WorkingGroupAssignment_workingGroupId_assessmentId_key" ON "WorkingGroupAssignment"("workingGroupId", "assessmentId");
