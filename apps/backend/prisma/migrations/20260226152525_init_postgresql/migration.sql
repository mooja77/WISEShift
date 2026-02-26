-- CreateTable
CREATE TABLE "Organisation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "accessCode" TEXT NOT NULL,
    "accessCodeHash" TEXT,
    "consentedAt" TIMESTAMP(3),
    "consentVersion" TEXT,
    "country" TEXT,
    "region" TEXT,
    "sector" TEXT,
    "size" TEXT,
    "legalStructure" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organisation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DomainGoal" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "domainKey" TEXT NOT NULL,
    "targetScore" DOUBLE PRECISION NOT NULL,
    "targetDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DomainGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WISEProfile" (
    "id" TEXT NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WISEProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assessment" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "overallScore" DOUBLE PRECISION,
    "previousAssessmentId" TEXT,
    "collaborators" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Response" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "domainKey" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "questionType" TEXT NOT NULL,
    "numericValue" INTEGER,
    "textValue" TEXT,
    "tags" TEXT,
    "claimedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Response_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DomainScore" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "domainKey" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "maturityLevel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DomainScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionPlan" (
    "id" TEXT NOT NULL,
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
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SectorScore" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "sectorKey" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SectorScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Benchmark" (
    "id" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "sampleSize" INTEGER NOT NULL,
    "domainAverages" TEXT NOT NULL,
    "domainPercentiles" TEXT NOT NULL,
    "overallAverage" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Benchmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DashboardAccess" (
    "id" TEXT NOT NULL,
    "accessCode" TEXT NOT NULL,
    "accessCodeHash" TEXT,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DashboardAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatrixCellSummary" (
    "id" TEXT NOT NULL,
    "dashboardAccessId" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MatrixCellSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchTag" (
    "id" TEXT NOT NULL,
    "dashboardAccessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "parentId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isInVivo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResearchTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TagOperation" (
    "id" TEXT NOT NULL,
    "dashboardAccessId" TEXT NOT NULL,
    "operationType" TEXT NOT NULL,
    "sourceTagIds" TEXT NOT NULL,
    "targetTagId" TEXT NOT NULL,
    "snapshot" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TagOperation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedQuery" (
    "id" TEXT NOT NULL,
    "dashboardAccessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedQuery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConceptMap" (
    "id" TEXT NOT NULL,
    "dashboardAccessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nodes" TEXT NOT NULL DEFAULT '[]',
    "edges" TEXT NOT NULL DEFAULT '[]',
    "viewport" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConceptMap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AISuggestion" (
    "id" TEXT NOT NULL,
    "dashboardAccessId" TEXT NOT NULL,
    "responseId" TEXT NOT NULL,
    "suggestedTagId" TEXT NOT NULL,
    "startOffset" INTEGER NOT NULL,
    "endOffset" INTEGER NOT NULL,
    "suggestedText" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AISuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TextHighlight" (
    "id" TEXT NOT NULL,
    "dashboardAccessId" TEXT NOT NULL,
    "responseId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "startOffset" INTEGER NOT NULL,
    "endOffset" INTEGER NOT NULL,
    "highlightedText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TextHighlight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchNote" (
    "id" TEXT NOT NULL,
    "dashboardAccessId" TEXT NOT NULL,
    "responseId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResearchNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuotePin" (
    "id" TEXT NOT NULL,
    "dashboardAccessId" TEXT NOT NULL,
    "responseId" TEXT NOT NULL,
    "quoteText" TEXT NOT NULL,
    "contextNote" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuotePin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodingLayer" (
    "id" TEXT NOT NULL,
    "dashboardAccessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CodingLayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LayerHighlight" (
    "id" TEXT NOT NULL,
    "codingLayerId" TEXT NOT NULL,
    "responseId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "startOffset" INTEGER NOT NULL,
    "endOffset" INTEGER NOT NULL,
    "highlightedText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LayerHighlight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LayerShare" (
    "id" TEXT NOT NULL,
    "codingLayerId" TEXT NOT NULL,
    "sharedWithId" TEXT NOT NULL,
    "permission" TEXT NOT NULL DEFAULT 'read',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LayerShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchMemo" (
    "id" TEXT NOT NULL,
    "dashboardAccessId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'analytical',
    "linkedResponseId" TEXT,
    "linkedTagId" TEXT,
    "linkedLayerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResearchMemo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodebookSnapshot" (
    "id" TEXT NOT NULL,
    "dashboardAccessId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "snapshot" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CodebookSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearcherAccount" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "institution" TEXT NOT NULL,
    "accessLevel" TEXT NOT NULL DEFAULT 'registered',
    "verificationCode" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "ethicsApproval" TEXT,
    "passwordHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResearcherAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataAccessLog" (
    "id" TEXT NOT NULL,
    "researcherId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "queryParams" TEXT,
    "resultCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DataAccessLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkingGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sector" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkingGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkingGroupMember" (
    "id" TEXT NOT NULL,
    "workingGroupId" TEXT NOT NULL,
    "accessCode" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkingGroupMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkingGroupAssignment" (
    "id" TEXT NOT NULL,
    "workingGroupId" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "assignedBy" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkingGroupAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Discussion" (
    "id" TEXT NOT NULL,
    "workingGroupId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Discussion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentLink" (
    "id" TEXT NOT NULL,
    "workingGroupId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "description" TEXT,
    "addedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityEntry" (
    "id" TEXT NOT NULL,
    "workingGroupId" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentRecord" (
    "id" TEXT NOT NULL,
    "subjectType" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "consentVersion" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "ipHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "actorType" TEXT NOT NULL,
    "actorId" TEXT,
    "ip" TEXT,
    "method" TEXT,
    "path" TEXT,
    "statusCode" INTEGER,
    "meta" TEXT,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organisation_accessCode_key" ON "Organisation"("accessCode");

-- CreateIndex
CREATE INDEX "Organisation_country_idx" ON "Organisation"("country");

-- CreateIndex
CREATE INDEX "Organisation_sector_idx" ON "Organisation"("sector");

-- CreateIndex
CREATE UNIQUE INDEX "DomainGoal_organisationId_domainKey_key" ON "DomainGoal"("organisationId", "domainKey");

-- CreateIndex
CREATE UNIQUE INDEX "WISEProfile_organisationId_key" ON "WISEProfile"("organisationId");

-- CreateIndex
CREATE UNIQUE INDEX "WISEProfile_slug_key" ON "WISEProfile"("slug");

-- CreateIndex
CREATE INDEX "Assessment_organisationId_idx" ON "Assessment"("organisationId");

-- CreateIndex
CREATE INDEX "Assessment_status_idx" ON "Assessment"("status");

-- CreateIndex
CREATE INDEX "Assessment_completedAt_idx" ON "Assessment"("completedAt");

-- CreateIndex
CREATE INDEX "Response_assessmentId_idx" ON "Response"("assessmentId");

-- CreateIndex
CREATE INDEX "Response_domainKey_idx" ON "Response"("domainKey");

-- CreateIndex
CREATE UNIQUE INDEX "Response_assessmentId_questionId_key" ON "Response"("assessmentId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "DomainScore_assessmentId_domainKey_key" ON "DomainScore"("assessmentId", "domainKey");

-- CreateIndex
CREATE INDEX "ActionPlan_assessmentId_idx" ON "ActionPlan"("assessmentId");

-- CreateIndex
CREATE UNIQUE INDEX "SectorScore_assessmentId_sectorKey_key" ON "SectorScore"("assessmentId", "sectorKey");

-- CreateIndex
CREATE UNIQUE INDEX "Benchmark_sector_key" ON "Benchmark"("sector");

-- CreateIndex
CREATE UNIQUE INDEX "DashboardAccess_accessCode_key" ON "DashboardAccess"("accessCode");

-- CreateIndex
CREATE UNIQUE INDEX "MatrixCellSummary_dashboardAccessId_assessmentId_tagId_key" ON "MatrixCellSummary"("dashboardAccessId", "assessmentId", "tagId");

-- CreateIndex
CREATE INDEX "ResearchTag_dashboardAccessId_idx" ON "ResearchTag"("dashboardAccessId");

-- CreateIndex
CREATE INDEX "ResearchTag_parentId_idx" ON "ResearchTag"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "ResearchTag_dashboardAccessId_name_key" ON "ResearchTag"("dashboardAccessId", "name");

-- CreateIndex
CREATE INDEX "TagOperation_dashboardAccessId_idx" ON "TagOperation"("dashboardAccessId");

-- CreateIndex
CREATE UNIQUE INDEX "SavedQuery_dashboardAccessId_name_key" ON "SavedQuery"("dashboardAccessId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ConceptMap_dashboardAccessId_name_key" ON "ConceptMap"("dashboardAccessId", "name");

-- CreateIndex
CREATE INDEX "AISuggestion_dashboardAccessId_idx" ON "AISuggestion"("dashboardAccessId");

-- CreateIndex
CREATE INDEX "AISuggestion_responseId_idx" ON "AISuggestion"("responseId");

-- CreateIndex
CREATE INDEX "AISuggestion_suggestedTagId_idx" ON "AISuggestion"("suggestedTagId");

-- CreateIndex
CREATE INDEX "TextHighlight_dashboardAccessId_idx" ON "TextHighlight"("dashboardAccessId");

-- CreateIndex
CREATE INDEX "TextHighlight_responseId_idx" ON "TextHighlight"("responseId");

-- CreateIndex
CREATE INDEX "TextHighlight_tagId_idx" ON "TextHighlight"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "ResearchNote_dashboardAccessId_responseId_key" ON "ResearchNote"("dashboardAccessId", "responseId");

-- CreateIndex
CREATE INDEX "QuotePin_dashboardAccessId_idx" ON "QuotePin"("dashboardAccessId");

-- CreateIndex
CREATE INDEX "QuotePin_responseId_idx" ON "QuotePin"("responseId");

-- CreateIndex
CREATE INDEX "CodingLayer_dashboardAccessId_idx" ON "CodingLayer"("dashboardAccessId");

-- CreateIndex
CREATE UNIQUE INDEX "CodingLayer_dashboardAccessId_name_key" ON "CodingLayer"("dashboardAccessId", "name");

-- CreateIndex
CREATE INDEX "LayerHighlight_codingLayerId_idx" ON "LayerHighlight"("codingLayerId");

-- CreateIndex
CREATE INDEX "LayerHighlight_responseId_idx" ON "LayerHighlight"("responseId");

-- CreateIndex
CREATE INDEX "LayerHighlight_tagId_idx" ON "LayerHighlight"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "LayerShare_codingLayerId_sharedWithId_key" ON "LayerShare"("codingLayerId", "sharedWithId");

-- CreateIndex
CREATE INDEX "ResearchMemo_dashboardAccessId_idx" ON "ResearchMemo"("dashboardAccessId");

-- CreateIndex
CREATE INDEX "ResearchMemo_type_idx" ON "ResearchMemo"("type");

-- CreateIndex
CREATE UNIQUE INDEX "ResearcherAccount_email_key" ON "ResearcherAccount"("email");

-- CreateIndex
CREATE UNIQUE INDEX "WorkingGroupMember_workingGroupId_accessCode_key" ON "WorkingGroupMember"("workingGroupId", "accessCode");

-- CreateIndex
CREATE UNIQUE INDEX "WorkingGroupAssignment_workingGroupId_assessmentId_key" ON "WorkingGroupAssignment"("workingGroupId", "assessmentId");

-- CreateIndex
CREATE INDEX "ConsentRecord_subjectType_subjectId_idx" ON "ConsentRecord"("subjectType", "subjectId");

-- CreateIndex
CREATE INDEX "ConsentRecord_createdAt_idx" ON "ConsentRecord"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_actorType_idx" ON "AuditLog"("actorType");

-- AddForeignKey
ALTER TABLE "DomainGoal" ADD CONSTRAINT "DomainGoal_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WISEProfile" ADD CONSTRAINT "WISEProfile_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Response" ADD CONSTRAINT "Response_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DomainScore" ADD CONSTRAINT "DomainScore_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionPlan" ADD CONSTRAINT "ActionPlan_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectorScore" ADD CONSTRAINT "SectorScore_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatrixCellSummary" ADD CONSTRAINT "MatrixCellSummary_dashboardAccessId_fkey" FOREIGN KEY ("dashboardAccessId") REFERENCES "DashboardAccess"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchTag" ADD CONSTRAINT "ResearchTag_dashboardAccessId_fkey" FOREIGN KEY ("dashboardAccessId") REFERENCES "DashboardAccess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchTag" ADD CONSTRAINT "ResearchTag_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ResearchTag"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TagOperation" ADD CONSTRAINT "TagOperation_dashboardAccessId_fkey" FOREIGN KEY ("dashboardAccessId") REFERENCES "DashboardAccess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedQuery" ADD CONSTRAINT "SavedQuery_dashboardAccessId_fkey" FOREIGN KEY ("dashboardAccessId") REFERENCES "DashboardAccess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConceptMap" ADD CONSTRAINT "ConceptMap_dashboardAccessId_fkey" FOREIGN KEY ("dashboardAccessId") REFERENCES "DashboardAccess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AISuggestion" ADD CONSTRAINT "AISuggestion_dashboardAccessId_fkey" FOREIGN KEY ("dashboardAccessId") REFERENCES "DashboardAccess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AISuggestion" ADD CONSTRAINT "AISuggestion_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "Response"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AISuggestion" ADD CONSTRAINT "AISuggestion_suggestedTagId_fkey" FOREIGN KEY ("suggestedTagId") REFERENCES "ResearchTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TextHighlight" ADD CONSTRAINT "TextHighlight_dashboardAccessId_fkey" FOREIGN KEY ("dashboardAccessId") REFERENCES "DashboardAccess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TextHighlight" ADD CONSTRAINT "TextHighlight_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "Response"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TextHighlight" ADD CONSTRAINT "TextHighlight_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "ResearchTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchNote" ADD CONSTRAINT "ResearchNote_dashboardAccessId_fkey" FOREIGN KEY ("dashboardAccessId") REFERENCES "DashboardAccess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchNote" ADD CONSTRAINT "ResearchNote_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "Response"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotePin" ADD CONSTRAINT "QuotePin_dashboardAccessId_fkey" FOREIGN KEY ("dashboardAccessId") REFERENCES "DashboardAccess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotePin" ADD CONSTRAINT "QuotePin_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "Response"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodingLayer" ADD CONSTRAINT "CodingLayer_dashboardAccessId_fkey" FOREIGN KEY ("dashboardAccessId") REFERENCES "DashboardAccess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LayerHighlight" ADD CONSTRAINT "LayerHighlight_codingLayerId_fkey" FOREIGN KEY ("codingLayerId") REFERENCES "CodingLayer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LayerHighlight" ADD CONSTRAINT "LayerHighlight_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "Response"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LayerHighlight" ADD CONSTRAINT "LayerHighlight_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "ResearchTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LayerShare" ADD CONSTRAINT "LayerShare_codingLayerId_fkey" FOREIGN KEY ("codingLayerId") REFERENCES "CodingLayer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LayerShare" ADD CONSTRAINT "LayerShare_sharedWithId_fkey" FOREIGN KEY ("sharedWithId") REFERENCES "DashboardAccess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchMemo" ADD CONSTRAINT "ResearchMemo_dashboardAccessId_fkey" FOREIGN KEY ("dashboardAccessId") REFERENCES "DashboardAccess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodebookSnapshot" ADD CONSTRAINT "CodebookSnapshot_dashboardAccessId_fkey" FOREIGN KEY ("dashboardAccessId") REFERENCES "DashboardAccess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataAccessLog" ADD CONSTRAINT "DataAccessLog_researcherId_fkey" FOREIGN KEY ("researcherId") REFERENCES "ResearcherAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkingGroupMember" ADD CONSTRAINT "WorkingGroupMember_workingGroupId_fkey" FOREIGN KEY ("workingGroupId") REFERENCES "WorkingGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkingGroupAssignment" ADD CONSTRAINT "WorkingGroupAssignment_workingGroupId_fkey" FOREIGN KEY ("workingGroupId") REFERENCES "WorkingGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkingGroupAssignment" ADD CONSTRAINT "WorkingGroupAssignment_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Discussion" ADD CONSTRAINT "Discussion_workingGroupId_fkey" FOREIGN KEY ("workingGroupId") REFERENCES "WorkingGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentLink" ADD CONSTRAINT "DocumentLink_workingGroupId_fkey" FOREIGN KEY ("workingGroupId") REFERENCES "WorkingGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityEntry" ADD CONSTRAINT "ActivityEntry_workingGroupId_fkey" FOREIGN KEY ("workingGroupId") REFERENCES "WorkingGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
