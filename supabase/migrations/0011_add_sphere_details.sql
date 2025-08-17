-- Migration: Add sphere_details JSONB field to store detailed sphere information
-- Adds ability to store complete sphere data from WholeMyMemory.md

BEGIN;

-- Add sphere_details field to store complete sphere information  
ALTER TABLE life_spheres 
ADD COLUMN IF NOT EXISTS sphere_details JSONB DEFAULT '{}'::jsonb;

-- Create index for faster queries on sphere_details
CREATE INDEX IF NOT EXISTS idx_life_spheres_sphere_details ON life_spheres USING GIN (sphere_details);

-- Add comment to explain the field
COMMENT ON COLUMN life_spheres.sphere_details IS 'Complete sphere details including components, protocols, synergy, etc. from operator profile';

COMMIT;

