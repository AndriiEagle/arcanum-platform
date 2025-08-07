-- Remove legacy life_spheres rows (sphere_code IS NULL) that are no longer referenced
-- Safe cleanup after task mapping (step 6)

BEGIN;

-- Optional: quick report counts before deletion
-- SELECT count(*) AS legacy_total FROM life_spheres WHERE sphere_code IS NULL;
-- SELECT count(*) AS legacy_with_tasks FROM life_spheres ls WHERE sphere_code IS NULL AND EXISTS (SELECT 1 FROM user_tasks ut WHERE ut.sphere_id = ls.id);
-- SELECT count(*) AS legacy_without_tasks FROM life_spheres ls WHERE sphere_code IS NULL AND NOT EXISTS (SELECT 1 FROM user_tasks ut WHERE ut.sphere_id = ls.id);

-- Delete only legacy rows that have no referencing tasks
DELETE FROM life_spheres ls
WHERE ls.sphere_code IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM user_tasks ut WHERE ut.sphere_id = ls.id
  );

COMMIT; 