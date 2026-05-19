import { readFileSync } from 'fs';
import { join } from 'path';

const SCRIPT_DIR = join(process.cwd(), 'src', 'scraper', 'in-browser');

export function loadPageScript(name: string): string {
  return readFileSync(join(SCRIPT_DIR, name), 'utf8').trim();
}
