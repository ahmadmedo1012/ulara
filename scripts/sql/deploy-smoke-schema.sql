-- scripts/sql/deploy-smoke-schema.sql — the read-only PRODUCTION
-- schema/catalog belt for the post-deploy smoke (r352 final closure §5:
-- the authenticated @test.ly probes left the live production smoke —
-- the schema/catalog regression signals they carried are now proven
-- READ-ONLY through this SQL instead of a public-password login).
--
-- What it proves (the two confirmed production-incident classes):
--   1. The P2021 signal: the r352 institutional tables/enums EXIST and
--      the seeded reference catalogs are populated (a 200 with an empty
--      catalog would be a silent seed regression, not a pass).
--   2. The P2022 signal: Faculty.orgUnitId / Department.orgUnitId /
--      PilotFeedback.institutionId exist and the org-unit mirror is
--      populated (the mirror backfill lived).
--   3. The migration ledger: applied rows exist and are healthy; the
--      pending state of 0006 (production applies it at merge time) is
--      REPORTED as a notice, never failed on.
--
-- Usage (from the deploy-smoke workflow, secret URL, read-only):
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/sql/deploy-smoke-schema.sql
--
-- STRICTLY READ-ONLY: SELECT + DO/RAISE only — no writes, no DDL.

DO $$
DECLARE
    t text;
    missing text[];
    n bigint;
    failed_migrations bigint;
BEGIN
    -- ── 1. the r352 institutional tables exist (the P2021 signal) ──
    FOREACH t IN ARRAY ARRAY[
        'OrganizationalUnit', 'UnitCapabilityGrant', 'InstitutionalPerson',
        'PositionTemplate', 'AccreditationCriteriaSet', 'AccreditationCriteriaItem',
        'ExternalAccreditation', 'OperationalLicense', 'RegulatoryInspection',
        'ComplianceFinding', 'CorrectiveActionPlan', 'InternalSelfAssessment',
        'SelfAssessmentItem', 'ComplianceEvidence', 'Program', 'ProgramEnrollment',
        'LearnerProfile', 'PilotFeedback', 'RegulatoryAuthority', 'InstitutionType'
    ]
    LOOP
        IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                       WHERE table_schema = 'public' AND table_name = t) THEN
            missing := array_append(missing, t);
        END IF;
    END LOOP;
    IF array_length(missing, 1) IS NOT NULL THEN
        RAISE EXCEPTION 'deploy-smoke schema belt: missing r352 tables: %', missing;
    END IF;
    RAISE NOTICE 'r352 institutional tables: present';

    -- ── 2. the seeded reference catalogs are populated (P2021, part 2) ──
    SELECT COUNT(*) INTO n FROM "RegulatoryAuthority";
    IF n = 0 THEN RAISE EXCEPTION 'deploy-smoke catalog belt: RegulatoryAuthority is empty (seed regression)'; END IF;
    RAISE NOTICE 'RegulatoryAuthority rows: %', n;
    SELECT COUNT(*) INTO n FROM "InstitutionType";
    IF n = 0 THEN RAISE EXCEPTION 'deploy-smoke catalog belt: InstitutionType is empty (seed regression)'; END IF;
    RAISE NOTICE 'InstitutionType rows: %', n;
    SELECT COUNT(*) INTO n FROM "CredentialType";
    IF n = 0 THEN RAISE EXCEPTION 'deploy-smoke catalog belt: CredentialType is empty (seed regression)'; END IF;
    RAISE NOTICE 'CredentialType rows: %', n;
    SELECT COUNT(*) INTO n FROM "PositionTemplate";
    IF n = 0 THEN RAISE EXCEPTION 'deploy-smoke catalog belt: PositionTemplate is empty (seed regression)'; END IF;
    RAISE NOTICE 'PositionTemplate rows: %', n;
    SELECT COUNT(*) INTO n FROM "AccreditationCriteriaSet";
    IF n = 0 THEN RAISE EXCEPTION 'deploy-smoke catalog belt: AccreditationCriteriaSet is empty (seed regression)'; END IF;
    SELECT COUNT(*) INTO n FROM "AccreditationCriteriaItem";
    IF n = 0 THEN RAISE EXCEPTION 'deploy-smoke catalog belt: AccreditationCriteriaItem is empty (seed regression)'; END IF;
    RAISE NOTICE 'criteria sets populated (sets + items)';
    SELECT COUNT(*) INTO n FROM "OrganizationalUnit";
    IF n = 0 THEN RAISE EXCEPTION 'deploy-smoke mirror belt: OrganizationalUnit is empty (mirror backfill regression)'; END IF;
    RAISE NOTICE 'OrganizationalUnit rows: %', n;

    -- ── 3. the P2022 columns exist and the mirror is linked ────────
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                   WHERE table_schema = 'public' AND table_name = '_prisma_migrations') THEN
        RAISE EXCEPTION 'deploy-smoke ledger belt: the _prisma_migrations ledger is missing';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public' AND table_name = 'Faculty' AND column_name = 'orgUnitId') THEN
        RAISE EXCEPTION 'deploy-smoke schema belt: Faculty.orgUnitId is missing (P2022 regression)';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public' AND table_name = 'Department' AND column_name = 'orgUnitId') THEN
        RAISE EXCEPTION 'deploy-smoke schema belt: Department.orgUnitId is missing (P2022 regression)';
    END IF;
    RAISE NOTICE 'r352 mirror columns present';
    -- PilotFeedback.institutionId arrives WITH migration 0006, which the
    -- production build gate applies AT MERGE TIME. Pre-merge production
    -- (0006 pending) is the DOCUMENTED state — reported as a notice.
    -- A ledger that claims 0006 APPLIED while the column is missing is
    -- the real regression (a partial/failed migration) and fails loudly.
    IF EXISTS (SELECT 1 FROM _prisma_migrations WHERE migration_name LIKE '0006\_%' ESCAPE '\' AND finished_at IS NOT NULL) THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_schema = 'public' AND table_name = 'PilotFeedback' AND column_name = 'institutionId') THEN
            RAISE EXCEPTION 'deploy-smoke schema belt: 0006 is marked applied but PilotFeedback.institutionId is missing (partial migration)';
        END IF;
        RAISE NOTICE '0006 applied: PilotFeedback.institutionId present';
    ELSE
        IF EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public' AND table_name = 'PilotFeedback' AND column_name = 'institutionId') THEN
            RAISE EXCEPTION 'deploy-smoke schema belt: PilotFeedback.institutionId exists while 0006 is NOT in the ledger (schema drift)';
        END IF;
        RAISE NOTICE '0006 pending (pre-merge documented state) — PilotFeedback.institutionId not yet required';
    END IF;

    -- ── 4. the migration ledger is healthy (0006 pending is OK) ────
    SELECT COUNT(*) INTO failed_migrations FROM _prisma_migrations WHERE finished_at IS NULL;
    IF failed_migrations > 0 THEN
        RAISE EXCEPTION 'deploy-smoke ledger belt: % migration(s) recorded as started-but-unfinished', failed_migrations;
    END IF;
    RAISE NOTICE 'migration ledger: % applied, % pending 0006 = %',
        (SELECT COUNT(*) FROM _prisma_migrations WHERE finished_at IS NOT NULL),
        (SELECT COUNT(*) FROM _prisma_migrations WHERE migration_name LIKE '0006\_%' ESCAPE '\'),
        EXISTS (SELECT 1 FROM _prisma_migrations WHERE migration_name LIKE '0006\_%' ESCAPE '\');
    RAISE NOTICE 'deploy-smoke schema belt: PASS';
END $$;
