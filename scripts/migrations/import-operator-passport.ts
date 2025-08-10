import fs from 'node:fs';
import path from 'node:path';
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// Usage (PowerShell):
// node scripts/migrations/import-operator-passport.js --file="ArcanumPlatformDocs copy.md" --user=<UUID>

interface ParsedEntry {
  version: string;
  last_update: string;
  profile_part: string;
  data: Record<string, unknown>;
}

function sanitizeSource(md: string): string {
  // Drop custom markers that break JSON
  let s = md.replace(/\[cite_start\]/g, '');
  return s;
}

function parseMultiJsonLike(md: string): ParsedEntry[] {
  const src = sanitizeSource(md);
  const entries: ParsedEntry[] = [];
  let depth = 0;
  let start = -1;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (ch === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0 && start >= 0) {
        const block = src.slice(start, i + 1);
        try {
          const obj = JSON.parse(block);
          if (obj && obj.version && obj.last_update && obj.data) {
            entries.push(obj as ParsedEntry);
          }
        } catch {
          // ignore non-JSON blocks
        }
        start = -1;
      }
    }
  }
  return entries;
}

function getArg(name: string): string | undefined {
  const flag = process.argv.find(a => a.startsWith(`--${name}=`));
  return flag ? flag.split('=')[1] : undefined;
}

async function main() {
  const fileArg = getArg('file') ?? 'ArcanumPlatformDocs copy.md';
  const userId = getArg('user');
  if (!userId) {
    throw new Error('Missing --user=<UUID>');
  }

  const supabaseUrl = process.env.SUPABASE_URL as string;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY as string;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('SUPABASE_URL or SUPABASE_SERVICE_KEY not set');
  }
  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

  const filePath = path.resolve(process.cwd(), fileArg);
  const raw = fs.readFileSync(filePath, 'utf8');
  const entries = parseMultiJsonLike(raw);
  if (entries.length === 0) {
    throw new Error('No JSON entries parsed from file');
  }

  // Upsert operator_profiles meta
  const latest = entries[0];
  const meta = { profile_parts: entries.map(e => e.profile_part), raw_text: raw };
  {
    const { error } = await supabase
      .from('operator_profiles')
      .upsert({
        user_id: userId,
        version: latest.version,
        last_update: latest.last_update,
        meta
      }, { onConflict: 'user_id' });
    if (error) throw error;
  }

  // Build a map from S-code to life_spheres.id (optional link)
  const { data: lifeRows, error: lifeErr } = await supabase
    .from('life_spheres')
    .select('id,sphere_code')
    .eq('user_id', userId);
  if (lifeErr) throw lifeErr;
  const codeToLifeId = new Map<string, string>();
  (lifeRows ?? []).forEach(r => r.sphere_code && codeToLifeId.set(r.sphere_code, r.id));

  for (const entry of entries) {
    for (const [key, value] of Object.entries(entry.data)) {
      const match = key.match(/^(S[1-9])_/);
      if (!match) continue;
      const sCode = match[1];
      const node = value as any;
      const meta = node.meta ?? {};
      const components = node.components ?? {};
      const synergy = node.synergy ?? {};

      const lifeId = codeToLifeId.get(sCode) ?? null;
      const payload: any = {
        user_id: userId,
        life_sphere_id: lifeId,
        sphere_code: sCode,
        meta,
        components,
        synergy
      };
      const { error } = await supabase
        .from('sphere_profiles')
        .upsert(payload, { onConflict: 'user_id,sphere_code' });
      if (error) throw error;
    }
  }

  console.log('Import completed: operator_profiles + sphere_profiles updated.');
}

main().catch(err => {
  console.error('Import failed:', err);
  process.exit(1);
}); 