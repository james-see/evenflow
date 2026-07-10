import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, mkdirSync, cpSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { cwd } from 'node:process';

export async function deploy(options: Record<string, string>): Promise<void> {
  const dir = cwd();

  if (!existsSync(resolve(dir, 'package.json'))) {
    throw new Error('No package.json found. Run this from a site directory.');
  }

  // Read site name from evenflow.config.json
  let siteName = 'evenflow-site';
  const configPath = resolve(dir, 'evenflow.config.json');
  if (existsSync(configPath)) {
    const config = JSON.parse(readFileSync(configPath, 'utf-8'));
    siteName = config.name ?? siteName;
  }

  // Determine repo URL
  const repoUrl = options.repo ?? getGitRemote(dir);
  if (!repoUrl) {
    throw new Error(
      'No GitHub repo URL found. Use --repo or set a git remote.\n' +
      'Example: evenflow deploy --repo https://github.com/user/my-site',
    );
  }

  // Extract owner/repo from URL
  const match = repoUrl.match(/github\.com[:/]([\w-]+)\/([\w.-]+?)(?:\.git)?$/);
  if (!match) {
    throw new Error(`Could not parse GitHub URL: ${repoUrl}`);
  }
  const [, owner, repo] = match;

  console.log(`\n  Deploying to GitHub Pages: ${owner}/${repo}`);

  // Build the site
  if (!existsSync(resolve(dir, 'node_modules'))) {
    console.log('  Installing dependencies...');
    spawnSync('npm', ['install'], { cwd: dir, stdio: 'inherit' });
  }

  console.log('  Building...');
  const buildResult = spawnSync('npx', ['astro', 'build'], { cwd: dir, stdio: 'inherit' });
  if (buildResult.status !== 0) {
    throw new Error('Build failed.');
  }

  const distDir = resolve(dir, 'dist');
  if (!existsSync(distDir)) {
    throw new Error('Build output not found in dist/');
  }

  // Check if gh CLI is available
  const ghCheck = spawnSync('gh', ['--version'], { stdio: 'pipe' });
  if (ghCheck.status !== 0) {
    throw new Error(
      'GitHub CLI (gh) not found. Install it from https://cli.github.com/',
    );
  }

  // Create or reuse a gh-pages orphan branch
  // Strategy: clone the repo's gh-pages branch (or create orphan), copy dist/, push
  const tmpDir = resolve(dir, '.evenflow-deploy');
  rmSync(tmpDir, { recursive: true, force: true });
  mkdirSync(tmpDir, { recursive: true });

  console.log('  Preparing gh-pages branch...');

  // Try to clone gh-pages branch; if it doesn't exist, init a fresh repo
  const cloneResult = spawnSync(
    'git',
    ['clone', '--branch', 'gh-pages', '--depth', '1', repoUrl, tmpDir],
    { stdio: 'pipe', encoding: 'utf-8' },
  );

  if (cloneResult.status !== 0) {
    // Branch doesn't exist — create orphan branch
    spawnSync('git', ['init', '-b', 'gh-pages', tmpDir], { stdio: 'pipe' });
    spawnSync('git', ['remote', 'add', 'origin', repoUrl], { cwd: tmpDir, stdio: 'pipe' });
  }

  // Clear the deploy dir and copy fresh build
  const entries = existsSync(tmpDir) ? readdirSync(tmpDir) : [];
  for (const entry of entries) {
    if (entry === '.git') continue;
    rmSync(join(tmpDir, entry), { recursive: true, force: true });
  }

  cpSync(distDir, tmpDir, { recursive: true });

  // Add a .nojekyll to bypass Jekyll processing
  writeFileSync(join(tmpDir, '.nojekyll'), '');

  // Commit and push
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

  // Cleanup
  rmSync(tmpDir, { recursive: true, force: true });

  const pagesUrl = `https://${owner}.github.io/${repo}/`;
  console.log(`\n  ✓ Deployed! Your site will be live at:`);
  console.log(`    ${pagesUrl}`);
  console.log(`\n  (May take a minute for GitHub Pages to update.)\n`);

  // Try to enable Pages via gh CLI if not already
  const enableResult = spawnSync(
    'gh',
    ['api', `-X=POST`, `/repos/${owner}/${repo}/pages`, '-f', 'build_type=legacy', '-f', 'source[branch]=gh-pages'],
    { stdio: 'pipe', encoding: 'utf-8' },
  );
  if (enableResult.status === 0) {
    console.log('  GitHub Pages enabled.');
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