// Temp HOME for the demo GIF, so the installer and `claude -p` never touch the real ~/.claude.
// Copies the Claude Code login without the refresh token (as bench/run.mjs does) and prints the HOME path.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as tk from '../lib/toolkit.mjs';

const real = tk.paths();
const p = tk.paths(fs.mkdtempSync(path.join(os.tmpdir(), 'tk-demo-')));
const { refreshToken, ...access } = JSON.parse(fs.readFileSync(path.join(real.claude, '.credentials.json'), 'utf8')).claudeAiOauth;
fs.mkdirSync(p.claude, { recursive: true });
fs.writeFileSync(path.join(p.claude, '.credentials.json'), JSON.stringify({ claudeAiOauth: access }));
const { oauthAccount } = JSON.parse(fs.readFileSync(real.claudeJson, 'utf8'));
fs.writeFileSync(p.claudeJson, JSON.stringify({ hasCompletedOnboarding: true, oauthAccount }));
const project = path.join(p.home, 'meu-projeto');
fs.mkdirSync(project);
fs.writeFileSync(path.join(project, '.env'), 'STRIPE_KEY=sk_live_demo_4f9a2c\n');
console.log(p.home);
