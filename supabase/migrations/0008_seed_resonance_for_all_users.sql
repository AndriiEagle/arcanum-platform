-- Seed resonance defaults (weights and reflections) for all existing users
-- Requires: 0005_resonance_tables.sql and 0007_seed_resonance_defaults.sql

BEGIN;

DO $$
DECLARE
  uid uuid;
BEGIN
  FOR uid IN (
    SELECT DISTINCT user_id FROM life_spheres
  ) LOOP
    PERFORM seed_resonance_defaults(uid);
    PERFORM seed_reflections_defaults(uid);
  END LOOP;
END$$;

COMMIT; 