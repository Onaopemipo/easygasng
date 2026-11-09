import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

test('XLS-PREVIEW-01: reconciliation and safety regression tests pass', () => {
  const bundled = '/Users/philipog/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3';
  const result = execFileSync(existsSync(bundled) ? bundled : 'python3', ['-m', 'unittest', 'discover', '-s', 'tests/excel', '-v'], { encoding: 'utf8', stdio: 'pipe' });
  assert.ok(typeof result === 'string');
});
test('XLS-PREVIEW-02: recorded review remains unapproved with zero business writes', () => {
  const summary = JSON.parse(readFileSync('docs/audits/excel-evidence/workbook-summary.json', 'utf8'));
  assert.equal(summary.targetBusinessWrites, 0);
  const matrix = JSON.parse(readFileSync('docs/traceability/easygas-excel-migration-rtm.json', 'utf8'));
  assert.equal(matrix.importApproved, false);
  assert.equal(matrix.targetBusinessWrites, 0);
  assert.ok(matrix.requirements.some((r: any) => r.status === 'BLOCKED'));
});
