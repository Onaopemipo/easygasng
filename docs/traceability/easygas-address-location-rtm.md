# Customer complete-address location assistance

Local implementation and verification complete. Production remains **NO-GO**.

| Requirement | Behavior | Status | Evidence |
|---|---|---|---|
| ADR-01 | Accept complete house addresses and resolve an eligible configured locality | VERIFIED_COMPLETE | ADR-01; ADR-04 |
| ADR-02 | Handle ambiguous, unavailable, unknown and conflicting locations without guessing | VERIFIED_COMPLETE | ADR-02 |
| ADR-03 | Clear stale automatic selections on address changes and allow manual correction | VERIFIED_COMPLETE | ADR-03 |
| ADR-05 | Apply the same area matching to gas, product, combined checkout and service addresses | VERIFIED_COMPLETE | Executed browser scenarios |
| ADR-06 | Save and reload the complete owned customer address with its selected location | VERIFIED_COMPLETE | Executed browser scenarios |

Coverage: implementation 5/5; verification 5/5; affected route groups 6/6; local gates 2/2. No P0 requirements introduced. Existing unrelated partial/blocked requirements remain in their phase matrices.

See the [machine-readable matrix](easygas-address-location-rtm.json) for implementation, authoritative sources, security and evidence. Tests: 24 passing resolver/service/recovery cases; TypeScript and build pass; browser verified all six route groups including address save and reload in isolated QA.

Matching is address-entry assistance, not physical geocoding. Type an area such as `Victoria Island` as a comma-separated locality, or end an unsegmented address with `Victoria Island Lagos Nigeria`. Unknown or multiple areas clear the automatic selection and leave an editable required area selector. A manually selected area is still subject to server coverage checks. No external provider receives addresses.

Change log: 2026-11-01 — added full-address textarea and shared resolver, stale-selection handling, manual correction, saved-address persistence and route-consistent use. Existing database schema, payment setup, dispatch confirmation and release decision preserved.
