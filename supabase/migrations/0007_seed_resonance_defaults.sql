-- Seed helpers for resonance defaults (weights and reflections)
-- Defaults per doc: base 0.2 for all pairs, strong 0.8, directional 0.6, S7 with all 0.7

BEGIN;

CREATE OR REPLACE FUNCTION seed_resonance_defaults(p_user_id uuid)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  s text[] := ARRAY['S1','S2','S3','S4','S5','S6','S7','S8','S9'];
  a text; b text;
BEGIN
  -- Base edges 0.2 for all ordered pairs (excluding self)
  FOREACH a IN ARRAY s LOOP
    FOREACH b IN ARRAY s LOOP
      IF a <> b THEN
        INSERT INTO resonance_weights(user_id, sphere_a, sphere_b, weight)
        VALUES (p_user_id, a, b, 0.2)
        ON CONFLICT (user_id, sphere_a, sphere_b) DO NOTHING;
      END IF;
    END LOOP;
  END LOOP;

  -- Strong symmetric pairs (0.8): S1<->S2, S2<->S6, S6<->S5, S5<->S4
  PERFORM 1 FROM (
    VALUES
      ('S1','S2',0.8),('S2','S1',0.8),
      ('S2','S6',0.8),('S6','S2',0.8),
      ('S6','S5',0.8),('S5','S6',0.8),
      ('S5','S4',0.8),('S4','S5',0.8)
  ) v(a,b,w)
  ON CONFLICT DO NOTHING; -- placeholder, below we upsert via actual INSERTs

  -- Upsert helper using INSERT ... ON CONFLICT DO UPDATE
  INSERT INTO resonance_weights(user_id, sphere_a, sphere_b, weight) VALUES
    (p_user_id,'S1','S2',0.8), (p_user_id,'S2','S1',0.8),
    (p_user_id,'S2','S6',0.8), (p_user_id,'S6','S2',0.8),
    (p_user_id,'S6','S5',0.8), (p_user_id,'S5','S6',0.8),
    (p_user_id,'S5','S4',0.8), (p_user_id,'S4','S5',0.8)
  ON CONFLICT (user_id, sphere_a, sphere_b) DO UPDATE SET weight = EXCLUDED.weight;

  -- Directional 0.6: S3->S1, S3->S6, S8->S5, S8->S6
  INSERT INTO resonance_weights(user_id, sphere_a, sphere_b, weight) VALUES
    (p_user_id,'S3','S1',0.6), (p_user_id,'S3','S6',0.6),
    (p_user_id,'S8','S5',0.6), (p_user_id,'S8','S6',0.6)
  ON CONFLICT (user_id, sphere_a, sphere_b) DO UPDATE SET weight = EXCLUDED.weight;

  -- S7 with all (0.7), symmetric
  FOREACH b IN ARRAY s LOOP
    IF b <> 'S7' THEN
      INSERT INTO resonance_weights(user_id, sphere_a, sphere_b, weight)
      VALUES (p_user_id, 'S7', b, 0.7)
      ON CONFLICT (user_id, sphere_a, sphere_b) DO UPDATE SET weight = EXCLUDED.weight;
      INSERT INTO resonance_weights(user_id, sphere_a, sphere_b, weight)
      VALUES (p_user_id, b, 'S7', 0.7)
      ON CONFLICT (user_id, sphere_a, sphere_b) DO UPDATE SET weight = EXCLUDED.weight;
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION seed_reflections_defaults(p_user_id uuid)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  s text[] := ARRAY['S1','S2','S3','S4','S5','S6','S7','S8','S9'];
  host text; guest text;
BEGIN
  FOREACH host IN ARRAY s LOOP
    FOREACH guest IN ARRAY s LOOP
      IF guest <> host THEN
        INSERT INTO sphere_reflections(user_id, host_sphere, guest_sphere, note)
        VALUES (p_user_id, host, guest, format('Seed: %s-in-%s', guest, host))
        ON CONFLICT (user_id, host_sphere, guest_sphere) DO NOTHING;
      END IF;
    END LOOP;
  END LOOP;
END;
$$;

COMMIT; 