import assert from 'node:assert/strict';
import { readFile, readdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { parseArgs } from 'node:util';
import sharp from 'sharp';
const { values } = parseArgs({ options: { app: { type: 'string' }, report: { type: 'string' } } });
assert.ok(values.app && values.report, '--app and --report required');
const sourcePath = 'apps/mobile/assets/app-icon.png';
const source = await readFile(sourcePath);
const approved = JSON.parse(await readFile('docs/mobile-app-icon/evidence/asset-and-config.json', 'utf8'));
const sourceSha256 = createHash('sha256').update(source).digest('hex');
assert.equal(sourceSha256, approved.sha256, 'Retain exact approved source icon');
const names = (await readdir(values.app)).filter(n => /^AppIcon.*\.png$/.test(n));
assert.ok(names.length >= 2, 'Packaged iPhone and iPad icons required');
const temp = await mkdtemp(path.join(tmpdir(), 'easygas-icon-verification-'));
const icons = [];
try {
  for (const name of names) {
    const decoded = path.join(temp, name);
    execFileSync('xcrun', ['pngcrush', '-revert-iphone-optimizations', '-q', path.join(values.app, name), decoded], { stdio: 'pipe' });
    const meta = await sharp(decoded).metadata();
    const actual = await sharp(decoded).removeAlpha().raw().toBuffer();
    const expected = await sharp(source).resize(meta.width, meta.height).removeAlpha().raw().toBuffer();
    assert.equal(actual.length, expected.length);
    let difference = 0;
    for (let i = 0; i < actual.length; i++) difference += Math.abs(actual[i] - expected[i]);
    const meanAbsoluteDifference = difference / actual.length;
    // Apple's colour/profile conversion and resize differ slightly from Sharp.
    assert.ok(meanAbsoluteDifference < 2, name + ' must match approved artwork');
    icons.push({ name, width: meta.width, height: meta.height, meanAbsoluteDifference });
  }
} finally { await rm(temp, { recursive: true, force: true }); }
await writeFile(values.report, JSON.stringify({ id: 'IOS24-ICON', status: 'PASS', sourcePath, sourceSha256, icons, scope: 'Exact signed archive icon packaging; installed launcher/theme/device acceptance remains open.' }, null, 2) + '\n');
console.log('✔ IOS24-ICON: Packaged iPhone/iPad icons match the exact approved source artwork within measured Apple resize/colour-conversion tolerance. Installed appearance remains untested.');
console.log('ℹ tests 1\nℹ pass 1\nℹ fail 0\nℹ skipped 0');
