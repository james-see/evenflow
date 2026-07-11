import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, mkdirSync, cpSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { cwd } from 'node:process';
import { loadConfig, saveConfig } from '../utils/config.js';
import { ensureNodeModules } from '../utils/npm.js';

export async function deploy(options: Record<string, string>): Promise<void> {
  const dir = cwd();

  if (!existsSync(resolve(dir, 'package.json'))) {
    throw new Error('No package.json found. Run this from a site directory.');
  }

  const config = loadConfig(dir);
  let siteName = config.name ?? 'evenflow-site';

  // Determine repo URL: flag > config > git remote
  let repoUrl: string | null = options.repo ?? config.repo ?? getGitRemote(dir);

  if (!repoUrl) {
    throw new Error(
      'No GitHub repo URL found.\n' +
      'Pass --repo, set it with `evenflow config set repo <url>`, or configure a git remote.\n' +
      'Example: evenflow deploy --repo https://github.com/user/my-site',
    );
  }

  // Save repo URL to config for future deploys
  if (options.repo) {
    saveConfig({ repo: repoUrl }, dir);
  }

  // Extract owner/repo from URL
  const match = repoUrl.match(/github\.com[:/]([\w-]+)\/([\w.-]+?)(?:\.git)?$/);
  if (!match) {
    throw new Error(`Could not parse GitHub URL: ${repoUrl}`);
  }
  const [, owner, repo] = match;

  console.log(`\n  Deploying to GitHub Pages: ${owner}/${repo}`);

  // Ensure gh CLI is available
  const ghCheck = spawnSync('gh', ['--version'], { stdio: 'pipe' });
  if (ghCheck.status !== 0) {
    throw new Error(
      'GitHub CLI (gh) not found. Install it from https://cli.github.com/ and run `gh auth login`.',
    );
  }

  // Optionally create the GitHub repo if requested
  if (options.createRepo === 'true') {
    console.log('  Creating GitHub repo if it does not exist...');
    spawnSync('gh', ['repo', 'create', `${owner}/${repo}`, '--public', '--confirm'], {
      stdio: 'inherit',
    });
  }

  // Build the site unless --skip-build is passed
  ensureNodeModules(dir);
  if (options.skipBuild !== 'true') {
    console.log('  Building...');
    const buildResult = spawnSync('npx', ['astro', 'build'], { cwd: dir, stdio: 'inherit' });
    if (buildResult.status !== 0) {
      throw new Error('Build failed.');
    }
  } else {
    console.log('  Skipping build (--skip-build).');
  }

  const distDir = resolve(dir, 'dist');
  if (!existsSync(distDir)) {
    throw new Error('Build output not found in dist/. Run `evenflow build` first.');
  }

  // Create or reuse a gh-pages orphan branch
  const tmpDir = resolve(dir, '.evenflow-deploy');
  rmSync(tmpDir, { recursive: true, force: true });
  mkdirSync(tmpDir, { recursive: true });

  console.log('  Preparing gh-pages branch...');

  const cloneResult = spawnSync(
    'git',
    ['clone', '--branch', 'gh-pages', '--depth', '1', repoUrl, tmpDir],
    { stdio: 'pipe', encoding: 'utf-8' },
  );

  if (cloneResult.status !== 0) {
    spawnSync('git', ['init', '-b', 'gh-pages', tmpDir], { stdio: 'pipe' });
    spawnSync('git', ['remote', 'add', 'origin', repoUrl], { cwd: tmpDir, stdio: 'pipe' });
  }

  const entries = existsSync(tmpDir) ? readdirSync(tmpDir) : [];
  for (const entry of entries) {
    if (entry === '.git') continue;
    rmSync(join(tmpDir, entry), { recursive: true, force: true });
  }

  cpSync(distDir, tmpDir, { recursive: true });
  writeFileSync(join(tmpDir, '.nojekyll'), '');

  console.log('  Pushing to gh-pages branch...');

  spawnSync('git', ['add', '-A'], { cwd: tmpDir, stdio: 'pipe' });
  spawnSync(
    'git',
    ['commit', '-m', `Deploy ${siteName} — ${new Date().toISOString()}`],
    { cwd: tmpDir, stdio: 'pipe', encoding: 'utf-8' },
  );
  spawnSync('git', ['push', '-u', 'origin', 'gh-pages', '--force'], {
    cwd: tmpDir,
    stdio: 'inherit',
  });

  rmSync(tmpDir, { recursive: true, force: true });

  const pagesUrl = `https://${owner}.github.io/${repo}/`;
  console.log(`\n  ✓ Deployed! Your site will be live at:`);
  console.log(`    ${pagesUrl}`);
  console.log(`\n  (May take a minute for GitHub Pages to update.)\n`);
  console.log('  Default admin credentials: admin / admin123');
  console.log('  Change the password immediately after first login.\n');

  // Try to enable Pages via gh CLI
  const enableResult = spawnSync(
    'gh',
    ['api', `-X=POST`, `/repos/${owner}/${repo}/pages`, '-f', 'build_type=legacy', '-f', 'source[branch]=gh-pages'],
    { stdio: 'pipe', encoding: 'utf-8' },
  );
  if (enableResult.status === 0) {
    console.log('  GitHub Pages enabled.');
  } else {
    console.log('  Could not auto-enable GitHub Pages. Enable it manually at:');
    console.log(`    https://github.com/${owner}/${repo}/settings/pages`);
  }
}

function getGitRemote(dir: string): string | null {
  const result = spawnSync('git', ['remote', 'get-url', 'origin'], {
    cwd: dir,
    stdio: 'pipe',
    encoding: 'utf-8',
  });
  if (result.status === 0 && result.stdout.trim()) {
    return result.stdout.trim();
  }
  return null;
}
