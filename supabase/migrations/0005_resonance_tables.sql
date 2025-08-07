-- Resonance core tables: per-user weights, reflections, orchestrator logs
-- Safe, additive migration (step 7)

BEGIN;

-- ==============================
-- resonance_weights (per-user)
-- ==============================
CREATE TABLE IF NOT EXISTS resonance_weights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  sphere_a TEXT NOT NULL,
  sphere_b TEXT NOT NULL,
  weight NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT resonance_weights_weight_chk CHECK (weight >= 0 AND weight <= 1),
  CONSTRAINT resonance_weights_sphere_a_chk CHECK (sphere_a IN ('S1','S2','S3','S4','S5','S6','S7','S8','S9')),
  CONSTRAINT resonance_weights_sphere_b_chk CHECK (sphere_b IN ('S1','S2','S3','S4','S5','S6','S7','S8','S9')),
  CONSTRAINT resonance_weights_user_pair_uniq UNIQUE (user_id, sphere_a, sphere_b)
);

CREATE INDEX IF NOT EXISTS idx_res_weights_user ON resonance_weights(user_id);
CREATE INDEX IF NOT EXISTS idx_res_weights_pair ON resonance_weights(sphere_a, sphere_b);

ALTER TABLE resonance_weights ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'resonance_weights'
  ) THEN
    CREATE POLICY "Users manage own resonance_weights" ON resonance_weights
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END$$;

-- =================================
-- sphere_reflections (per-user X-in-Y)
-- =================================
CREATE TABLE IF NOT EXISTS sphere_reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  host_sphere TEXT NOT NULL,
  guest_sphere TEXT NOT NULL,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT sphere_reflections_host_chk CHECK (host_sphere IN ('S1','S2','S3','S4','S5','S6','S7','S8','S9')),
  CONSTRAINT sphere_reflections_guest_chk CHECK (guest_sphere IN ('S1','S2','S3','S4','S5','S6','S7','S8','S9')),
  CONSTRAINT sphere_reflections_user_pair_uniq UNIQUE (user_id, host_sphere, guest_sphere)
);

CREATE INDEX IF NOT EXISTS idx_sphere_reflections_user ON sphere_reflections(user_id);
CREATE INDEX IF NOT EXISTS idx_sphere_reflections_host ON sphere_reflections(host_sphere);

ALTER TABLE sphere_reflections ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'sphere_reflections'
  ) THEN
    CREATE POLICY "Users manage own sphere_reflections" ON sphere_reflections
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END$$;

-- =================================
-- orchestrator_events (per-user logs)
-- =================================
CREATE TABLE IF NOT EXISTS orchestrator_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT orchestrator_events_type_chk CHECK (event_type IN (
    'DAILY_PLAN','WEEKLY_PLAN','MONTHLY_PLAN','WEIGHT_UPDATE','TASK_SCORE_RECALC','INFO'
  ))
);

CREATE INDEX IF NOT EXISTS idx_orch_events_user ON orchestrator_events(user_id);
CREATE INDEX IF NOT EXISTS idx_orch_events_created ON orchestrator_events(created_at);
CREATE INDEX IF NOT EXISTS idx_orch_events_type ON orchestrator_events(event_type);

ALTER TABLE orchestrator_events ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'orchestrator_events'
  ) THEN
    CREATE POLICY "Users manage own orchestrator_events" ON orchestrator_events
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END$$;

COMMIT; 