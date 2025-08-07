-- Extend user_tasks for resonance scoring fields (step 8)

BEGIN;

ALTER TABLE user_tasks
  ADD COLUMN IF NOT EXISTS expected_effect JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS secondary_spheres TEXT[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS effort NUMERIC DEFAULT 2.0,
  ADD COLUMN IF NOT EXISTS purpose_score NUMERIC DEFAULT 0.8,
  ADD COLUMN IF NOT EXISTS score NUMERIC;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_tasks_effort_chk'
  ) THEN
    ALTER TABLE user_tasks
      ADD CONSTRAINT user_tasks_effort_chk CHECK (effort >= 0.5 AND effort <= 5.0);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_tasks_purpose_score_chk'
  ) THEN
    ALTER TABLE user_tasks
      ADD CONSTRAINT user_tasks_purpose_score_chk CHECK (purpose_score >= 0 AND purpose_score <= 1);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_tasks_secondary_spheres_chk'
  ) THEN
    -- Ensure secondary_spheres is subset of allowed S-codes
    ALTER TABLE user_tasks
      ADD CONSTRAINT user_tasks_secondary_spheres_chk CHECK (secondary_spheres <@ ARRAY['S1','S2','S3','S4','S5','S6','S7','S8','S9']::text[]);
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_user_tasks_score ON user_tasks(score);
CREATE INDEX IF NOT EXISTS idx_user_tasks_due_date ON user_tasks(due_date);

COMMIT; 