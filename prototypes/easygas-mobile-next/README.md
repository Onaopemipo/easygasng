# EasyGas Mobile Next

New private mobile-app design prototype: [open review](https://easygas-mobile-next.philipmuyiwa.chatgpt.site). Start with Review controls → Customer; use the same controls for all eight personas, exception scenarios and dark appearance.

Run `node prototypes/easygas-mobile-next/build.mjs`, then `node prototypes/easygas-mobile-next/server.mjs` from the repository root (port3031). The UI uses the existing isolated prototype domain, preserving 36 families / 300 features. It never calls the live website, payment provider or device APIs. CSP forbids network connections and form destinations.

`experience.ts` adapts the canonical model. `main.tsx` contains the new mobile interface, short checkout and focused role sheets. `style.css` handles responsive layouts, dark appearance and reduced motion. `source-manifest.json` records the ten bundled local source inputs. Build assets use existing transparent EasyGas branding. `.openai/hosting.json` retains the single private Site identity.

Publication uses `scripts/stage-mobile-next.mjs` to copy only the ten source inputs, build files and three public assets into an isolated temporary source checkout. It excludes native credentials, environment files, customer data and unrelated repository contents. Use the Sites skill to push/package the exact source and preserve owner-only access; do not recreate the Site or change its audience.

This is not a native binary or individual acceptance of every feature. [Audit](../../docs/mobile-ux-20261123/README.md), [manual](../../docs/user-manual/mobile-experience-redesign.md), [traceability](../../docs/traceability/mobile-ux-20261123-rtm.md).
