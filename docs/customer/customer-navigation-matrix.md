# Customer navigation configuration

The authoritative configuration is packages/business-rules/src/customer-navigation.ts. The complete 15-route component/data/auth/loading/error/verification mapping is in docs/traceability/easygas-customer-routes.json and easygas-customer-route-matrix.md.

Groups: Your EasyGas (overview, notifications, account/privacy); Gas & Services (services, bookings, profiles); Orders & Payments (orders, wallet, credit); Rewards & Plans (rewards, schedules, recurring, smart refill); Support (help, conversations). Overview group stays visible. Other groups collapse using buttons with aria-expanded and aria-controls. Route changes expose the active group. Exact active matching avoids prefix collisions; service details and tracking map explicitly.

Icons reuse lucide-react. Links retain accessible labels in compact mode, native titles and focus/hover tooltips. Full logo and official compact icon are retained. Per-user preferences store only collapsed/group state. Account name/email/initials come from the authenticated profile. Real unread notifications, in-flight orders, active bookings and open support counts are customer-scoped; unavailable sources hide counts and offer retry.

Mobile drawer has a named modal dialog, inert content, backdrop/close controls, Escape and focus restoration. Touch controls and sidebar links are at least 44px. Scoped reduced-motion CSS disables decorative transitions. Browser evidence includes all routes at 1560px and 390px, correct active links, compact76px persistence, initial drawer focus and Escape. Remaining tablet/full-focus-cycle/screen-reader/live-motion checks stay open in the RTM.
