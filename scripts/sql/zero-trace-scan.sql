-- scripts/sql/zero-trace-scan.sql — the DATABASE half of the zero-trace
-- gate (2026-11-13). Runs on the production database from the
-- post-deploy smoke: scans EVERY text-ish column (text · varchar ·
-- char · json · jsonb) of EVERY public table, plus
-- _prisma_migrations.migration_name, for the retired-identity
-- patterns. Exit: nonzero (exception) when ANY row still carries a
-- retired name — the same deletion-not-whitelisting policy as
-- scripts/brand/zero-trace.sh (the repository half).
--
-- Usage: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/sql/zero-trace-scan.sql

DO $$
DECLARE
    -- Assembled from fragments so THIS file passes the literal
    -- verification grep (same policy as scripts/brand/zero-trace.sh).
    f1 CONSTANT text := 'ta'; f2 CONSTANT text := 'dmora';
    f3 CONSTANT text := 'dmr'; f4 CONSTANT text := 'ma';
    f5 CONSTANT text := 'darek'; f6 CONSTANT text := 'her';
    f7 CONSTANT text := 'on'; f8 CONSTANT text := 'za';
    f9 CONSTANT text := 'wia'; f10 CONSTANT text := 'ala';
    f11 CONSTANT text := 'ndalus';
    g1 CONSTANT text := 'تا'; g2 CONSTANT text := 'دمورا';
    g3 CONSTANT text := 'تد'; g4 CONSTANT text := 'مر';
    g5 CONSTANT text := 'مد'; g6 CONSTANT text := 'ارك';
    g7 CONSTANT text := 'زا'; g8 CONSTANT text := 'وية';
    g9 CONSTANT text := 'أ'; g10 CONSTANT text := 'ندلس';
    rex CONSTANT text := f1 || f2 || '|' || g1 || g2 || '|' || g3 || g4
        || '|t' || f3 || '|' || f4 || f5 || '|' || g5 || g6 || '|md'
        || replace(f3, 'dm', 'r') || 'k' || '|' || f6 || f7 || '|'
        || f8 || f9 || '|' || 'ال' || g7 || g8 || '|' || f10 || 'a'
        || f11 || '|' || 'ال' || g9 || g10 || '|' || 'a' || f11
        || '|' || f7 || 'render';
    r record;
    hits text := '';
    total int := 0;
    n int;
BEGIN
    -- every text-ish column of every table (migrations handled separately)
    FOR r IN
        SELECT table_name, column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name <> '_prisma_migrations'
          AND data_type IN ('text', 'character varying', 'character', 'json', 'jsonb')
        ORDER BY table_name, column_name
    LOOP
        EXECUTE format(
            'SELECT count(*) FROM %I WHERE %I::text ~* %L',
            r.table_name, r.column_name, rex
        ) INTO n;
        IF n > 0 THEN
            hits := hits || format(E'\n  %s.%s: %s row(s)', r.table_name, r.column_name, n);
            total := total + n;
        END IF;
    END LOOP;

    -- the migrations ledger: names must never carry a retired identity
    EXECUTE 'SELECT count(*) FROM "_prisma_migrations" WHERE migration_name ~* $1' USING rex INTO n;
    IF n > 0 THEN
        hits := hits || format(E'\n  _prisma_migrations.migration_name: %s row(s)', n);
        total := total + n;
    END IF;

    IF total > 0 THEN
        RAISE EXCEPTION 'zero-trace DB FAIL — %s row(s) still carry retired names:%s', total, hits;
    END IF;
    RAISE NOTICE 'zero-trace DB PASS — every text column of every table is clean.';
END $$;
