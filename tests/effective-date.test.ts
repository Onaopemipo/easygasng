import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {effectiveDateInLagos} from '../packages/business-rules/src/effective-date';
test('DATE-02: date-only selection uses Lagos midnight and rejects malformed dates',()=>{
 assert.equal(effectiveDateInLagos('2026-11-10'),'2026-11-10T00:00:00+01:00');
 assert.equal(new Date(effectiveDateInLagos('2026-11-10')).toISOString(),'2026-11-09T23:00:00.000Z');
 assert.equal(effectiveDateInLagos('2028-02-29'),'2028-02-29T00:00:00+01:00');
 for(const d of ['2026-02-30','2026-02-29','2026-13-01','2026-11-10T10:00','not-a-date','']) assert.throws(()=>effectiveDateInLagos(d),/valid effective date/);
 const admin=readFileSync('apps/web/components/admin.tsx','utf8');assert.equal((admin.match(/effectiveDateInLagos\(effectiveAt\)/g)||[]).length,2);
 assert.ok(admin.includes('type="date"\n          value={effectiveAt}'));assert.ok(!admin.includes('effectiveAt.length === 16'));
});
test('DATE-03: date control preserves change handler and closes on valid selection; checkbox rows place control before label',()=>{
 const input=readFileSync('apps/web/components/password-input.tsx','utf8');assert.ok(input.includes('props.onChange?.(event)'));assert.ok(input.includes('event.currentTarget.validity.valid) event.currentTarget.blur()'));
 const css=readFileSync('apps/web/app/globals.css','utf8');assert.ok(css.includes('body label:has(> input[type="checkbox"])'));assert.ok(css.includes('order: -1;'));assert.ok(css.includes('flex: 0 0 20px;'));
});
