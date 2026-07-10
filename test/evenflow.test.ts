import { spawn, spawnSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { cwd } from 'node:process';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

const TEMPLATE_DIR = resolve(cwd(), 'src', 'template', 'default');
const ROOT_DIR = cwd();

function run(cmd: string, args: string[], options: { cwd?: string; timeout?: number } = {}): Promise<{ exitCode: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd: options.cwd, stdio: 'pipe' });
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (d) => { stdout += d; });
    child.stderr?.on('data', (d) => { stderr += d; });
    const timer = options.timeout ? setTimeout(() => child.kill('SIGTERM'), options.timeout) : null;
    child.on('close', (exitCode) => {
      if (timer) clearTimeout(timer);
      resolve({ exitCode, stdout, stderr });
    });
    child.on('error', reject);
  });
}

function waitForServer(url: string, timeoutMs = 10000): Promise<void> {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    function check() {
      http.get(url, (res) => {
        if (res.statusCode === 200) {
          res.resume();
          resolve();
        } else {
          retry();
        }
      }).on('error', retry);
    }
    function retry() {
      if (Date.now() - start > timeoutMs) {
        reject(new Error(`Server did not respond within ${timeoutMs}ms`));
      } else {
        setTimeout(check, 200);
      }
    }
    check();
  });
}

test('CLI root package builds with tsc', async () => {
  const { exitCode, stderr } = await run('npm', ['run', 'build'], { cwd: ROOT_DIR });
  assert.equal(exitCode, 0, `tsc failed: ${stderr}`);
});

test('Template site builds with astro build', async () => {
  assert.ok(existsSync(resolve(TEMPLATE_DIR, 'package.json')), 'template package.json missing');
  if (!existsSync(resolve(TEMPLATE_DIR, 'node_modules'))) {
    const install = await run('npm', ['install'], { cwd: TEMPLATE_DIR, timeout: 120000 });
    assert.equal(install.exitCode, 0, `npm install failed: ${install.stderr}`);
  }
  const { exitCode, stderr } = await run('npx', ['astro', 'build'], { cwd: TEMPLATE_DIR, timeout: 120000 });
  assert.equal(exitCode, 0, `astro build failed: ${stderr}`);
  assert.ok(existsSync(resolve(TEMPLATE_DIR, 'dist', 'index.html')), 'dist/index.html missing');
  assert.ok(existsSync(resolve(TEMPLATE_DIR, 'dist', 'admin', 'index.html')), 'dist/admin/index.html missing');
});

test('Template dev server starts and serves a page', async () => {
  const port = 4322;
  const child = spawn('npx', ['astro', 'dev', '--port', String(port)], { cwd: TEMPLATE_DIR, stdio: 'pipe' });
  try {
    await waitForServer(`http://localhost:${port}/`);
    const { statusCode } = await new Promise<{ statusCode?: number }>((resolve) => {
      http.get(`http://localhost:${port}/`, (res) => resolve({ statusCode: res.statusCode })).on('error', () => resolve({ statusCode: 0 }));
    });
    assert.equal(statusCode, 200, 'dev server did not return 200');
  } finally {
    child.kill('SIGTERM');
  }
});

test('evenflow CLI help prints', async () => {
  const { exitCode, stdout } = await run('node', ['./bin/evenflow.js', '--help'], { cwd: ROOT_DIR });
  assert.equal(exitCode, 0, 'help exited non-zero');
  assert.ok(stdout.includes('Usage:'), 'help missing Usage');
});

test('Template create command scaffolds a site', async () => {
  const tmpDir = resolve(ROOT_DIR, '.tmp-test-site');
  rmSync(tmpDir, { recursive: true, force: true });
  const { exitCode, stderr } = await run('node', ['./bin/evenflow.js', 'create', '.tmp-test-site'], { cwd: ROOT_DIR, timeout: 60000 });
  assert.equal(exitCode, 0, `create failed: ${stderr}`);
  assert.ok(existsSync(resolve(tmpDir, 'package.json')), 'created site package.json missing');
  assert.ok(existsSync(resolve(tmpDir, 'astro.config.mjs')), 'created site astro.config.mjs missing');
  rmSync(tmpDir, { recursive: true, force: true });
});
