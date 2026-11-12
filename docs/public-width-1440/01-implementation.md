# Public website width implementation

| Source file | Change |
| --- | --- |
| `apps/web/components/site.tsx` | Marks the main element only for the seven listed public paths and only outside the signed-in customer workspace. Home also scrolls to the existing How It Works section when it mounts after hash navigation. |
| `apps/web/app/public-width.css` | Aligns the marked main's content and the associated public header, navigation and footer rows. Keeps the coverage card inset and allows the Home eyebrow to fit on narrow screens. |
| `apps/web/app/layout.tsx` | Loads the scoped stylesheet after the existing page styles. |
| `apps/web/app/homepage.css` | Removes the superseded 1320px rule. |

The shared maximum is 1440 CSS pixels measured at the border box, including horizontal padding. The shell centers at larger widths. Gutters are 40px at 1440px and up, 24–32px at 1024–1439px, 24px at 768–1023px, and 16–20px below 768px. The coverage card is inset to the content edges and retains its own inner padding.

Header, navigation, hero photography, benefits and footer backgrounds use their existing full-width bands. The gas order form keeps its existing editor and summary grid. The exact path set deliberately excludes child product and service URLs and the separate `/how-it-works` page. The Home anchor is covered by the `/` entry. Existing session-based workspace selection is reused.

No data contracts, backend source, payment settings, storage, role rules or native files were changed by this phase. The working tree contains unrelated earlier changes.
