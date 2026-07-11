import { copyTemplate } from '../utils/copy.js';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { cwd } from 'node:process';
import { saveConfig } from '../utils/config.js';
import { ensureNodeModules } from '../utils/npm.js';

export async function create(name: string | undefined, options: Record<string, string>): Promise<void> {
  if (!name) {
    throw new Error('Site name required. Usage: evenflow create <name>');
  }

  const target = resolve(cwd(), name);
  if (existsSync(target)) {
    throw new Error(`Directory "${name}" already exists.`);
  }

  const template = options.template ?? 'default';
  const repo = options.repo;
  console.log(`\n  Creating site "${name}" using "${template}" template...`);

  mkdirSync(target, { recursive: true });
  await copyTemplate(template, target);

  // Write .gitignore
  writeFileSync(
    join(target, '.gitignore'),
    'node_modules/\ndist/\n.astro/\n.DS_Store\n.env\n',
  );

  // Write evenflow.config.json
  const config: { name: string; template: string; createdAt: string; repo?: string } = {
    name,
    template,
    createdAt: new Date().toISOString(),
  };
  if (repo) config.repo = repo;
  writeFileSync(
    join(target, 'evenflow.config.json'),
    JSON.stringify(config, null, 2) + '\n',
  );

  // Install dependencies automatically
  ensureNodeModules(target);

  console.log(`\n  ✓ Site created at ${target}`);
  console.log(`\n  Next steps:`);
  if (repo) {
    console.log(`    cd ${name}`);
    console.log(`    evenflow deploy`);
  } else {
    console.log(`    cd ${name}`);
    console.log(`    evenflow deploy --repo https://github.com/yourusername/${name}`);
  }
  console.log(`\n  Default admin credentials: admin / admin123`);
  console.log(`  Change the password immediately after first login.\n`);
}