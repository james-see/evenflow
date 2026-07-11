#!/usr/bin/env node

import { create } from './commands/create.js';
import { dev } from './commands/dev.js';
import { build } from './commands/build.js';
import { deploy } from './commands/deploy.js';
import { config } from './commands/config.js';

interface Args {
  command: string;
  subcommand?: string;
  options: Record<string, string>;
  positional: string[];
}

function parseArgs(argv: string[]): Args {
  const args = argv.slice(2);
  const command = args[0] ?? '';
  const positional: string[] = [];
  const options: Record<string, string> = {};

  // Only the 'config' command uses a subcommand (list/get/set)
  const subcommand = command === 'config' && args[1] && !args[1].startsWith('--') ? args[1] : undefined;
  const startIndex = subcommand ? 2 : 1;

  for (let i = startIndex; i < args.length; i++) {
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

  return { command, subcommand, options, positional };
}

const HELP = `
  Evenflow — CMS-powered static sites with SQLite WASM + OPFS

  Usage:
    evenflow create <name>              Scaffold a new site in ./<name>
    evenflow dev                       Start local dev server
    evenflow build                     Build static site to dist/
    evenflow deploy                    Deploy to GitHub Pages
    evenflow config list               Show site configuration
    evenflow config get <key>          Read a config value
    evenflow config set <key> <value>  Set a config value

  Options:
    --template <name>                  Template to use (default: default)
    --port <number>                    Dev server port (default: 4321)
    --repo <url>                       GitHub repo URL for deploy
    --create-repo                      Create the GitHub repo if it does not exist
    --skip-build                       Skip the Astro build during deploy
    --help, -h                         Show this help

  Examples:
    evenflow create my-blog --repo https://github.com/user/my-blog
    cd my-blog && evenflow deploy
    evenflow deploy --repo https://github.com/user/my-blog --create-repo
    evenflow config set repo https://github.com/user/my-blog
`;

async function main() {
  const { command, subcommand, options, positional } = parseArgs(process.argv);

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
      case 'config':
        await config(subcommand ?? 'list', positional[0], positional[1]);
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