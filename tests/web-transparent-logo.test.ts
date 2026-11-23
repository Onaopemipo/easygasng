import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {reviewedWebLogoSourceHash} from '../scripts/lib/reviewed-web-logo-source.mjs';

test('WLOGO-SOURCE: only the two approved CSS continuations advance historical proofs; tampered inputs fail', async () => {
  const review=JSON.parse(await readFile('docs/web-transparent-logo/reviewed-source-changes.json','utf8'));
  for(const [file, baseline] of Object.entries(review.baseline)) {
    assert.equal(await reviewedWebLogoSourceHash(file,baseline),createHash('sha256').update(await readFile(file)).digest('hex'));
    await assert.rejects(()=>reviewedWebLogoSourceHash(file,'0'.repeat(64)), /historical logo baseline/);
  }
  for(const file of ['apps/mobile/BrandLogo.tsx','prototypes/easygas-mobile/source-manifest.json','apps/web/lib/auth.ts'])
    assert.equal(await reviewedWebLogoSourceHash(file,'unchanged'),'unchanged');
});
