import { loadConfig, saveConfig } from '../utils/config.js';
import { cwd } from 'node:process';

type ConfigKey = keyof ReturnType<typeof loadConfig>;

export async function config(action: string, key?: string, value?: string): Promise<void> {
  const dir = cwd();

  if (!action || action === 'list') {
    const config = loadConfig(dir);
    console.log(JSON.stringify(config, null, 2));
    return;
  }

  if (action === 'get') {
    if (!key) throw new Error('Usage: evenflow config get <key>');
    const config = loadConfig(dir);
    const val = config[key as ConfigKey];
    console.log(val ?? '');
    return;
  }

  if (action === 'set') {
    if (!key || value === undefined) throw new Error('Usage: evenflow config set <key> <value>');
    const patch: Record<string, string> = { [key]: value };
    saveConfig(patch, dir);
    console.log(`Set ${key} = ${value}`);
    return;
  }

  throw new Error(`Unknown config action: ${action}. Use: list, get, set`);
}
