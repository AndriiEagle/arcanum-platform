BEGIN;

-- ==========================
-- operator_profiles (per-user)
-- ==========================
CREATE TABLE IF NOT EXISTS operator_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  version TEXT,
  last_update DATE,
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT operator_profiles_user_uniq UNIQUE (user_id)
);

ALTER TABLE operator_profiles ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'operator_profiles'
  ) THEN
    CREATE POLICY "Users manage own operator_profiles" ON operator_profiles
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_operator_profiles_user ON operator_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_operator_profiles_last_update ON operator_profiles(last_update);

-- ==========================
-- sphere_profiles (per-sphere rich JSON)
-- ==========================
CREATE TABLE IF NOT EXISTS sphere_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  life_sphere_id UUID REFERENCES life_spheres(id) ON DELETE CASCADE,
  sphere_code TEXT NOT NULL,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  components JSONB NOT NULL DEFAULT '{}'::jsonb,
  synergy JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT sphere_profiles_code_chk CHECK (sphere_code IN ('S1','S2','S3','S4','S5','S6','S7','S8','S9')),
  CONSTRAINT sphere_profiles_user_code_uniq UNIQUE (user_id, sphere_code)
);

ALTER TABLE sphere_profiles ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'sphere_profiles'
  ) THEN
    CREATE POLICY "Users manage own sphere_profiles" ON sphere_profiles
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_sphere_profiles_user ON sphere_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_sphere_profiles_code ON sphere_profiles(sphere_code);
CREATE INDEX IF NOT EXISTS idx_sphere_profiles_life_id ON sphere_profiles(life_sphere_id);

COMMIT; 