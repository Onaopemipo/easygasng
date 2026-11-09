# App typography and readability audit — 30 October 2026

The website now uses a minimum declared text size of 1rem (16px at default browser settings). The audit removed 296 declarations below 16px from 395 existing CSS font-size declarations, including Settings styles as small as 6–10px. Headings retain a larger hierarchy. Sizes use rem units and respect the browser's default font setting.

Settings has larger section headings, readable descriptions, values, ownership labels and controls. Cards and actions wrap; the settings navigation reflows below 1101px. The admin sidebar is wider on desktop and its labels wrap. Product grids adapt to the available width. Long headings wrap instead of overflowing on phones. Tables keep their own horizontal scrolling containers.

The native application now shares Text and TextInput defaults of 16 with proportional line spacing, preserving larger headings and device font scaling. Eighteen explicit native font sizes below 16 were increased. Unstyled labels, inputs, notices and navigation also receive the shared default. Printable service reports now use a 16px minimum.

## Verification

- Web TypeScript check passed.
- Native TypeScript check passed.
- Next production compilation passed in the isolated `.next-qa` build directory.
- Both Android and iOS Hermes exports passed.
- Six catalogue/service regression tests passed, including report escaping and protected report content.
- Browser audit covered 69 base routes at 1280px desktop and 390px phone widths (138 measurements), using the isolated synthetic QA database. Final measurements found no displayed text below 16px and no page-level horizontal overflow.
- All twelve Settings categories were opened and checked at phone width. Desktop Settings was also visually inspected.
- A phone overflow on the Recommendations heading was found and corrected before the final measurements.

## Evidence and scope

- [Browser measurements](typography-browser-audit-2026-10-30.json)
- [Source audit](typography-source-audit-2026-10-30.json)
- [Web build](typography-web-build-2026-10-30.txt)
- [Web typecheck](typography-web-typecheck-2026-10-30.txt)
- [Native typecheck](typography-native-typecheck-2026-10-30.txt)
- [Native export](typography-native-export-2026-10-30.txt)
- [Regression tests](typography-report-tests-2026-10-30.txt)
- [Desktop Settings preview](../screenshots/settings-typography-desktop-20261030.png)
- [Phone Settings preview](../screenshots/settings-typography-mobile-20261030.png)

The source audit covers shared typography used by detail pages and dialogs. Browser measurements cover rendered base routes and the fixture data present; they do not assert every possible populated workflow, dialog or role state was visually exercised. Native checks cover source, type checking and bundle export; physical-device typography and enlarged accessibility settings remain device acceptance work. Logos and text baked into artwork are image assets and are outside CSS font-size measurements. This update is local; it does not publish a deployment.
