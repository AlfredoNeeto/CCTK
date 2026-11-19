// Temp HOME for the demo GIF, so the installer and `claude -p` never touch the real ~/.claude.
// Copies the Claude Code access token (no refresh token, as bench/run.mjs does) and prints the HOME path.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as tk from '../lib/toolkit.mjs';

const real = tk.paths();
// At the drive root, not in os.tmpdir(): the GIF shows the project path, and the temp dir carries the user name.
const p = tk.paths(fs.mkdtempSync(path.join(path.parse(os.tmpdir()).root, 'tk-demo-')));
// The GIF is public: copy only what the login needs. The plan fields would show up in the welcome header.
const { accessToken, expiresAt, scopes } = JSON.parse(fs.readFileSync(path.join(real.claude, '.credentials.json'), 'utf8')).claudeAiOauth;
fs.mkdirSync(p.claude, { recursive: true });
fs.writeFileSync(path.join(p.claude, '.credentials.json'), JSON.stringify({ claudeAiOauth: { accessToken, expiresAt, scopes } }));
const { oauthAccount: { accountUuid, organizationUuid } = {}, lastOnboardingVersion, lastReleaseNotesSeen } = JSON.parse(fs.readFileSync(real.claudeJson, 'utf8'));
const project = path.join(p.home, 'meu-projeto');
// The interactive demo opens `claude` in the project: skip onboarding, release notes and the folder-trust dialog.
fs.writeFileSync(p.claudeJson, JSON.stringify({
  hasCompletedOnboarding: true, oauthAccount: { accountUuid, organizationUuid }, lastOnboardingVersion, lastReleaseNotesSeen,
  projects: { [project.replace(/\\/g, '/')]: { hasTrustDialogAccepted: true } },
}));
fs.mkdirSync(project);
fs.writeFileSync(path.join(project, '.env'), 'STRIPE_KEY=sk_live_demo_4f9a2c\n');
console.log(p.home);
