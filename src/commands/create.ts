import { copyTemplate } from '../utils/copy.js';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { cwd } from 'node:process';

export async function create(name: string | undefined, options: Record<string, string>): Promise<void> {
  if (!name) {
    throw new Error('Site name required. Usage: evenflow create <name>');
  }

  const target = resolve(cwd(), name);
  if (existsSync(target)) {
    throw new Error(`Directory "${name}" already exists.`);
  }

  const template = options.template ?? 'default';
  console.log(`\n  Creating site "${name}" using "${template}" template...`);

  mkdirSync(target, { recursive: true });
  await copyTemplate(template, target);

  // Write .gitignore
  writeFileSync(
    join(target, '.gitignore'),
    'node_modules/\ndist/\n.astro/\n.DS_Store\n.env\n',
  );

  // Write evenflow.config.json
  writeFileSync(
    join(target, 'evenflow.config.json'),
    JSON.stringify({ name, template, createdAt: new Date().toISOString() }, null, 2) + '\n',
  );

  console.log(`\n  ✓ Site created at ${target}`);
  console.log(`\n  Next steps:`);
  console.log(`    cd ${name}`);
  console.log(`    npm install`);
  console.log(`    npx evenflow dev\n`);
}