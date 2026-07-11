import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

export function ensureNodeModules(dir: string): void {
  if (!existsSync(resolve(dir, 'node_modules'))) {
    console.log('  Installing dependencies...');
    const result = spawnSync('npm', ['install'], { cwd: dir, stdio: 'inherit' });
    if (result.status !== 0) {
      throw new Error('npm install failed');
    }
  }
}
