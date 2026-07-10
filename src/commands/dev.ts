import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { cwd } from 'node:process';

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

  child.on('close', (code) => {
    process.exit(code ?? 0);
  });
}

function ensureNodeModules(dir: string): void {
  if (!existsSync(resolve(dir, 'node_modules'))) {
    console.log('  Installing dependencies...');
    spawnSync('npm', ['install'], { cwd: dir, stdio: 'inherit' });
  }
}