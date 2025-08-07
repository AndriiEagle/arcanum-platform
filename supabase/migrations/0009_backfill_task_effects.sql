-- Backfill scoring fields for legacy tasks (step 10)
-- Sets defaults only when fields are NULL or empty

BEGIN;

-- 1) expected_effect: {"<primary_sphere_code>": 0.8}
UPDATE user_tasks t
SET expected_effect = jsonb_build_object(ls.sphere_code, 0.8)
FROM life_spheres ls
WHERE t.sphere_id = ls.id
  AND ls.sphere_code IS NOT NULL
  AND (t.expected_effect IS NULL OR t.expected_effect = '{}'::jsonb);

-- 2) secondary_spheres: empty array if NULL
UPDATE user_tasks
SET secondary_spheres = '{}'::text[]
WHERE secondary_spheres IS NULL;

-- 3) effort: 2.0 if NULL
UPDATE user_tasks
SET effort = 2.0
WHERE effort IS NULL;

-- 4) purpose_score: 0.8 if NULL
UPDATE user_tasks
SET purpose_score = 0.8
WHERE purpose_score IS NULL;

COMMIT; 