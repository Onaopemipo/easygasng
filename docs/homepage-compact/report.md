# Compact homepage implementation

The homepage uses a centred 1,320px content area with responsive gutters, the existing cooking hero, a tighter order panel and benefits strip, service cards, a product carousel, compact ordering steps, account and rewards cards, testimonials and a slimmer coverage section. The current public header retains the theme control between cart and account. The demo notice uses normal document flow on the homepage.

Coverage marketing lists active, visible areas only after the existing coverage predicate passes. Pending locations remain available to inspect in the selector. Empty testimonials and service previews use their existing honest fallback. Service cards use the approved backend image when available and a service icon otherwise. The existing governed website image selection remains available, with the original cooking asset as the default.

Native customer Home changes only spacing. It retains its existing artwork, appearance control, order routing and role-specific navigation.

## API mapping

| Area | Authority |
| --- | --- |
| Hero, service heading and footer contacts | Governed website.content settings and existing default brand assets |
| Quick-order amounts | gas.catalogue active gas.price_per_kg and delivery.fee settings, versions and quantity policy |
| Delivery eligibility and totals | gas.quote and existing checkout revalidation, with delivery_locations and gas_stock |
| Products and availability | Published catalogue, branch inventory and gas stock |
| Services | Active service catalogue and existing service media, with independent booking eligibility checks |
| Testimonials | Existing public moderation and consent rules |
| Theme | Existing web and Expo appearance providers |

## Verification

Web and native type checks passed. The web production build and iOS/Android Expo bundle exports passed. The 60 focused tests and final 676-test PostgreSQL regression passed. Browser evidence covers ten viewport widths, system appearance switching and existing customer paths using an isolated synthetic fixture. See [evidence](evidence/) and the [60-scenario register](scenarios.csv). Native interactive acceptance, physical devices, full browser zoom and assistive technology remain open.

## Rollback and release

Revert the homepage component and CSS changes, demo-notice placement, and native spacing change with its preservation-test update. No migration or provider change is required. Keep existing active settings, inventory, order and payment records. The feature is local and production remains NO-GO.
