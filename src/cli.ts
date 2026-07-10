#!/usr/bin/env node

import { create } from './commands/create.js';
import { dev } from './commands/dev.js';
import { build } from './commands/build.js';
import { deploy } from './commands/deploy.js';

interface Args {
  command: string;
  options: Record<string, string>;
  positional: string[];
}

function parseArgs(argv: string[]): Args {
  const args = argv.slice(2);
  const command = args[0] ?? '';
  const positional: string[] = [];
  const options: Record<string, string> = {};

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith('--')) {
        options[key] = next;
        i++;
      } else {
        options[key] = 'true';
      }
    } else {
      positional.push(arg);
    }
  }

  return { command, options, positional };
}

const HELP = `
  Evenflow — CMS-powered static sites with SQLite WASM + OPFS

  Usage:
    evenflow create <name>     Scaffold a new site in ./<name>
    evenflow dev               Start local dev server
    evenflow build             Build static site to dist/
    evenflow deploy            Deploy to GitHub Pages

  Options:
    --template <name>          Template to use (default: default)
    --port <number>            Dev server port (default: 4321)
    --repo <url>               GitHub repo URL for deploy
    --help, -h                 Show this help

  Examples:
    evenflow create my-blog
    cd my-blog && evenflow dev
    evenflow build
    evenflow deploy --repo https://github.com/user/repo
`;

async function main() {
  const { command, options, positional } = parseArgs(process.argv);

  if (command === '--help' || command === '-h' || !command) {
    console.log(HELP);
    return;
  }

  try {
    switch (command) {
      case 'create':
        await create(positional[0], options);
        break;
      case 'dev':
        await dev(options);
        break;
      case 'build':
        await build(options);
        break;
      case 'deploy':
        await deploy(options);
        break;
      default:
        console.error(`Unknown command: ${command}`);
        console.log(HELP);
        process.exit(1);
    }
  } catch (err) {
    console.error(`\nError: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
  }
}

main();