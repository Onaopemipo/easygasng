# Transparent web logos

The approved web and native wordmark bytes already match and have alpha transparency. White boxes were CSS backgrounds on the public header/footer, customer sidebar, fixed-green staff sidebar and introduction logo. This phase removes logo-only backplates and uses a white inverse rendering on dark/fixed-green surfaces, preserving original colours on light surfaces. Wordmark proportions, links, accessible names, compact icons and document artwork are retained.

Only `apps/web/app/theme.css` and `apps/web/app/customer-introduction.css` change application behaviour. No image generation or asset edits. Printed/emailed financial documents keep their original artwork and white document layout.

Local verification: 21 existing/focused source/header/introduction/artifact regressions and six original prototype checks pass; production build and sequential typecheck pass. Historical manifests remain byte-for-byte intact. Source continuation accepts only these two CSS files and rejects tampered baseline input. Hosted visual/deployment acceptance is pending.

[Matrix](../traceability/web-transparent-logo-rtm.md). Production NO-GO and unrelated acceptance gates remain; no native build/export/install or business-data changes.
