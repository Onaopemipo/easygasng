// Executes actual synthetic model assertions and static/source artifact checks.
// These tests make no live business requests and do not certify the production backend.
await import('../scripts/test-experience-prototype.mjs');
await import('../scripts/validate-experience-prototype.mjs');
