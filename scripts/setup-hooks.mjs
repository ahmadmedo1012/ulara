#!/usr/bin/env node
/**
 * setup-hooks — the root `prepare` lifecycle hook (package.json).
 *
 * Wires the repo's git hooks (.githooks/*) into the local clone via
 * `git config core.hooksPath` — the standard shared-hooks pattern.
 *
 * Deployment-safe by construction: platforms that build WITHOUT a git
 * directory (Vercel uploads a plain file tree — no .git) would fail a
 * bare `git config` invocation with "not a git repository", which npm
 * treats as a prepare-hook FAILURE and aborts the whole install. This
 * script no-ops instead when .git is absent — the hooks are a local
 * development convenience, never a deployment requirement.
 */
import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

if (existsSync('.git')) {
  execSync('git config core.hooksPath .githooks', { stdio: 'inherit' });
}
