import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cwd } from 'node:process';

export interface EvenflowConfig {
  name?: string;
  template?: string;
  repo?: string;
  createdAt?: string;
}

export function loadConfig(dir = cwd()): EvenflowConfig {
  const configPath = resolve(dir, 'evenflow.config.json');
  if (!existsSync(configPath)) return {};
  try {
    return JSON.parse(readFileSync(configPath, 'utf-8')) as EvenflowConfig;
  } catch {
    return {};
  }
}

export function saveConfig(config: EvenflowConfig, dir = cwd()): void {
  const configPath = resolve(dir, 'evenflow.config.json');
  const existing = loadConfig(dir);
  writeFileSync(
    configPath,
    JSON.stringify({ ...existing, ...config }, null, 2) + '\n',
  );
}
