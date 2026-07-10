import { cpSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Copy a named template to the target directory.
 * Templates live at <package-root>/src/template/<name> and are also
 * copied to <package-root>/dist/template/<name> during build.
 * We check dist/ first (for installed npm package), then src/ (for dev).
 */
export async function copyTemplate(name: string, target: string): Promise<void> {
  // Try dist/template first (published package), then src/template (dev)
  const candidates = [
    resolve(__dirname, '..', 'template', name),
    resolve(__dirname, '..', '..', 'src', 'template', name),
  ];

  let templateDir: string | null = null;
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      templateDir = candidate;
      break;
    }
  }

  if (!templateDir) {
    throw new Error(`Template "${name}" not found. Available templates: default`);
  }

  cpSync(templateDir, target, {
    recursive: true,
    filter: (src) => {
      const parts = src.split('/');
      return !parts.some((p) => p === 'node_modules' || p === 'dist' || p === '.astro');
    },
  });
}