import { promises as fs } from 'fs';
import path from 'path';

// Simple JSON file persistence utility (atomic-ish via temp file rename)
export async function loadJSON<T>(file: string): Promise<T | null> {
  try {
    const data = await fs.readFile(file, 'utf-8');
    return JSON.parse(data) as T;
  } catch (err: any) {
    if (err.code === 'ENOENT') return null;
    console.error('[ML Persistence] load error', err);
    return null;
  }
}

export async function saveJSON(file: string, data: any): Promise<void> {
  try {
    const dir = path.dirname(file);
    await fs.mkdir(dir, { recursive: true });
    
    // Validate data before saving
    const serialized = JSON.stringify(data, null, 2);
    if (!serialized || serialized === '{}') {
      console.warn('[ML Persistence] Empty data, skipping save');
      return;
    }
    
    const tmp = file + '.tmp';
    await fs.writeFile(tmp, serialized);
    try {
      await fs.rename(tmp, file);
    } catch (e:any) {
      if (e?.code === 'ENOENT') {
        // Fallback: write directly (possible race where tmp moved already)
        try { await fs.writeFile(file, serialized) } catch(inner) { throw inner }
      } else {
        throw e;
      }
    }
    console.log(`[ML Persistence] Saved ${file} (${(serialized.length / 1024).toFixed(1)}KB)`);
  } catch (err) {
    console.error('[ML Persistence] save error', err);
    throw err; // Re-throw so callers know about failures
  }
}

export function resolveDataPath(relative: string) {
  return path.resolve(process.cwd(), 'data', relative);
}
