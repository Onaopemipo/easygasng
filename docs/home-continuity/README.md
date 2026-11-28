# Homepage continuity —28 November2026

Returning from a public page to Home now shows the previously loaded public homepage while Next.js fetches a fresh server response. Hero, ordering card, public catalogue and footer stay available; gas price and delivery fee remain visible. Cold visits and full document reloads still load normally. This is public content continuity, not persisted checkout/account/form state.

The memory-only snapshot is published after Home renders and contains only the existing anonymous catalogue fields. A Home-specific route fallback renders it while the server page is pending. A failed client refresh keeps the loaded Home with a labelled retry notice; successful data replaces it and cancelled older requests cannot overwrite it. Same-origin, plain public→Home navigation remains client-side even with analytics loaded; private, token/query/hash and external transitions preserve the existing hard navigation boundary. Server checkout prices, authentication and authorisation remain authoritative.

## Executed acceptance

- [Focused checks](evidence/focused-tests.txt):23 passed,0 failed,0 skipped, including actual fallback rendering, Site catalogue-state source, real WorkspaceLink analytics interception, whitelist/privacy, refresh failure/replacement and late-response cancellation; existing price/checkout and analytics regression included.
- [Types](evidence/typecheck.txt) and [Next.js build](evidence/build.txt) passed. [Root mirrored tests](evidence/root-tests.txt)23/23 and [root types](evidence/root-typecheck.txt) passed while preserving unrelated local auth work.
- [Hosted browser](evidence/browser-verification.json): actual Home→Products→Home navigation observed the retained wrapper1, complete Home and both prices, no full-page loader. After the fresh server response wrapper0, same visible content and prices, no console errors. [Immediate transition DOM](evidence/return-home-dom.txt), [screenshot](evidence/retained-home.jpg).
- [Deployment](evidence/release.json): application commit82a1427 pushed and deployed to the existing demo. All514 uploaded source files match the staged archive by SHA-1 ([verification](evidence/deployed-source.json)). [Hosted read-only probes](evidence/stable-verification.json) confirm ready status, first-response prices and unauthenticated checkout denial.

## Scope and limits

All3 bounded requirements and gates are verified. Browser acceptance used normal hosted latency rather than injected throttling; refresh failures and stale-response races were exercised in the renderer harness. Full reloads intentionally reset the memory snapshot. No schema, private cache, business record, native binary or live-provider changes. Existing wider production NO-GO, operational/provider/physical/device gates and unrelated work remain unchanged. Roll back only this demo runtime by promoting the previous deployment in release.json.

[Traceability](../traceability/home-continuity-rtm.md).
