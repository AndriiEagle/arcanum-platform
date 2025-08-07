-- Migration: add sphere_code and seed function for 9 fractal spheres
-- Safe, additive changes

BEGIN;

-- 1) Extend life_spheres with new ontology fields
ALTER TABLE life_spheres
  ADD COLUMN IF NOT EXISTS sphere_code TEXT,
  ADD COLUMN IF NOT EXISTS level INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS currency JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS kpi JSONB DEFAULT '{}'::jsonb;

-- 2) Constraints and indexes for sphere_code
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'life_spheres_sphere_code_chk'
  ) THEN
    ALTER TABLE life_spheres
      ADD CONSTRAINT life_spheres_sphere_code_chk
      CHECK (sphere_code IS NULL OR sphere_code IN ('S1','S2','S3','S4','S5','S6','S7','S8','S9'));
  END IF;
END$$;

-- Unique per user + sphere_code (allows multiple users to have same code set)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'life_spheres_user_code_uniq'
  ) THEN
    ALTER TABLE life_spheres
      ADD CONSTRAINT life_spheres_user_code_uniq UNIQUE (user_id, sphere_code);
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_life_spheres_sphere_code ON life_spheres(sphere_code);

-- 3) Seed function to insert S1..S9 for a given user
CREATE OR REPLACE FUNCTION seed_spheres_v9(p_user_id uuid)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  -- S1 Vitality — Тело/Реактор
  INSERT INTO life_spheres (user_id, sphere_name, sphere_code, is_active, level, currency, kpi)
  VALUES (p_user_id, 'S1 — Vitality (Тело/Реактор)', 'S1', FALSE, 0, '{}'::jsonb, '{}'::jsonb)
  ON CONFLICT (user_id, sphere_code) DO NOTHING;

  -- S2 Mind/Code — Разум/Код
  INSERT INTO life_spheres (user_id, sphere_name, sphere_code, is_active, level, currency, kpi)
  VALUES (p_user_id, 'S2 — Mind/Code (Разум/Код)', 'S2', FALSE, 0, '{}'::jsonb, '{}'::jsonb)
  ON CONFLICT (user_id, sphere_code) DO NOTHING;

  -- S3 Habitat — Среда/Кокон
  INSERT INTO life_spheres (user_id, sphere_name, sphere_code, is_active, level, currency, kpi)
  VALUES (p_user_id, 'S3 — Habitat (Среда/Кокон)', 'S3', FALSE, 0, '{}'::jsonb, '{}'::jsonb)
  ON CONFLICT (user_id, sphere_code) DO NOTHING;

  -- S4 Action/Vector — Действие/Вектор
  INSERT INTO life_spheres (user_id, sphere_name, sphere_code, is_active, level, currency, kpi)
  VALUES (p_user_id, 'S4 — Action/Vector (Действие/Вектор)', 'S4', FALSE, 0, '{}'::jsonb, '{}'::jsonb)
  ON CONFLICT (user_id, sphere_code) DO NOTHING;

  -- S5 Communication/Influence — Связи/Коммуникация/Влияние
  INSERT INTO life_spheres (user_id, sphere_name, sphere_code, is_active, level, currency, kpi)
  VALUES (p_user_id, 'S5 — Communication/Influence (Связи/Коммуникация/Влияние)', 'S5', FALSE, 0, '{}'::jsonb, '{}'::jsonb)
  ON CONFLICT (user_id, sphere_code) DO NOTHING;

  -- S6 Craft/Production — Производство/Крафт
  INSERT INTO life_spheres (user_id, sphere_name, sphere_code, is_active, level, currency, kpi)
  VALUES (p_user_id, 'S6 — Craft/Production (Производство/Крафт)', 'S6', FALSE, 0, '{}'::jsonb, '{}'::jsonb)
  ON CONFLICT (user_id, sphere_code) DO NOTHING;

  -- S7 Status/Discipline — Статус/Дисциплина
  INSERT INTO life_spheres (user_id, sphere_name, sphere_code, is_active, level, currency, kpi)
  VALUES (p_user_id, 'S7 — Status/Discipline (Статус/Дисциплина)', 'S7', FALSE, 0, '{}'::jsonb, '{}'::jsonb)
  ON CONFLICT (user_id, sphere_code) DO NOTHING;

  -- S8 Network/Library — Сеть/Библиотека
  INSERT INTO life_spheres (user_id, sphere_name, sphere_code, is_active, level, currency, kpi)
  VALUES (p_user_id, 'S8 — Network/Library (Сеть/Библиотека)', 'S8', FALSE, 0, '{}'::jsonb, '{}'::jsonb)
  ON CONFLICT (user_id, sphere_code) DO NOTHING;

  -- S9 Capital/Resources — Ресурсы/Капитал
  INSERT INTO life_spheres (user_id, sphere_name, sphere_code, is_active, level, currency, kpi)
  VALUES (p_user_id, 'S9 — Capital/Resources (Ресурсы/Капитал)', 'S9', FALSE, 0, '{}'::jsonb, '{}'::jsonb)
  ON CONFLICT (user_id, sphere_code) DO NOTHING;
END;
$$;

COMMIT; 