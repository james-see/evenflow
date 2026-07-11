import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { cwd } from 'node:process';
import { ensureNodeModules } from '../utils/npm.js';

export async function dev(options: Record<string, string>): Promise<void> {
  const dir = cwd();
  const port = options.port ?? '4321';

  if (!existsSync(resolve(dir, 'package.json'))) {
    throw new Error('No package.json found. Run this from a site directory.');
  }

  ensureNodeModules(dir);

  console.log(`\n  Starting dev server on port ${port}...\n`);

  const child = spawn('npx', ['astro', 'dev', '--port', port], {
    cwd: dir,
    stdio: 'inherit',
  });

  return new Promise((resolve, reject) => {
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Dev server exited with code ${code}`));
      }
    });
    child.on('error', reject);
  });
}
