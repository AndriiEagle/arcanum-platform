-- Seed S1..S9 for all existing users (no TRUNCATE, legacy rows remain)
-- Requires function seed_spheres_v9(uuid) from previous migration

BEGIN;

DO $$
DECLARE
  uid uuid;
BEGIN
  FOR uid IN (
    SELECT DISTINCT user_id FROM life_spheres
    UNION
    SELECT DISTINCT user_id FROM user_tasks
    UNION
    SELECT DISTINCT user_id FROM user_stats
  ) LOOP
    PERFORM seed_spheres_v9(uid);
  END LOOP;
END$$;

COMMIT; 