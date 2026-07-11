import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { cwd } from 'node:process';
import { ensureNodeModules } from '../utils/npm.js';

export async function build(options: Record<string, string>): Promise<void> {
  const dir = cwd();

  if (!existsSync(resolve(dir, 'package.json'))) {
    throw new Error('No package.json found. Run this from a site directory.');
  }

  ensureNodeModules(dir);

  console.log('\n  Building static site...\n');

  const child = spawn('npx', ['astro', 'build'], {
    cwd: dir,
    stdio: 'inherit',
  });

  return new Promise((resolve, reject) => {
    child.on('close', (code) => {
      if (code === 0) {
        console.log('\n  ✓ Build complete. Output in dist/');
        resolve();
      } else {
        reject(new Error(`Build failed with code ${code}`));
      }
    });
    child.on('error', reject);
  });
}