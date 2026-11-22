-- r352 backend hardening #2 — the legacy-mirror org-unit ids become
-- cuid-shaped (live visual QA finding, 2026-11-22).
--
-- The migration-0003 backfill AND the seed catch-up
-- (prisma/seed-r352-catalogs.ts backfillOrgUnitsFromLegacy) mirrored
-- legacy Faculty/Department rows into OrganizationalUnit with ids
-- prefixed 'ou-f-<facultyId>' / 'ou-d-<departmentId>'. The API's zod
-- params (z.string().cuid() — e.g. ?orgUnitId= on people /
-- appointments / programs, parentId on create) REJECT those ids, so
-- every list filter and write targeting a mirrored unit answered 400
-- «Invalid cuid» (the org-unit detail panel's sibling queries are the
-- visible symptom).
--
-- The fix: the mirror id IS the legacy row's id (Prisma cuid() values,
-- collision-free across tables, traceable by construction). For rows
-- whose bare suffix is not already cuid-shaped, 'c' || suffix keeps
-- the shape valid. Every FK referencing OrganizationalUnit(id) is
-- declared ON UPDATE CASCADE (108 constraints in 0003), so the
-- rewrite cascades to Faculty/Department/InstitutionalPerson/
-- UnitCapabilityGrant/PositionAppointment/Council/… and the
-- self-referencing parentId in this one statement.
-- The seed catch-up now mirrors with the same convention
-- (idempotent against this migration: the row already exists with the
-- bare id, the NOT EXISTS guard skips, Faculty.orgUnitId is already
-- set by the cascade).
UPDATE "OrganizationalUnit"
SET "id" = CASE
  WHEN substring("id" from 6) ~ '^c[0-9a-z]{8,}$' THEN substring("id" from 6)
  ELSE 'c' || replace(substring("id" from 6), '-', '')
END
WHERE "id" LIKE 'ou-f-%' OR "id" LIKE 'ou-d-%';
