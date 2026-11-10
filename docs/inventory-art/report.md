# Inventory thumbnail overlap correction

The inventory thumbnail was37px wide, but the fallback starter-kit artwork contained intrinsic60px and34px icons. Flex overflow let them paint over the following product name. Bulk gas also fell through to that kit fallback.

Scope: inventory thumbnails now have a fixed non-shrinking37px box with overflow contained. The kit pair is explicitly23px +2px gap +12px, preserving both icons inside the thumbnail. Gas has its own flame illustration. Uploaded images and other catalogue layouts retain their existing sizing. No inventory/financial records or API payloads change.

Actual local authenticated browser verification: all9rows have8px spacing between thumbnail and name; both affected products have their SVGs wholly inside the thumbnail on desktop and390px mobile. Mobile document width375px, no page overflow. Five existing inventory regressions and web typecheck pass. Screenshots and measured bounds are under evidence/. No deployment yet. Production NO-GO and all previous scope/holds remain.
