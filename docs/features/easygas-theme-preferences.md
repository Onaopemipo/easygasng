# Theme preferences

Use the sun/moon button in the public, customer or administration/staff header, or Account & Privacy → Appearance → Light, Dark or System. The header button is 44×44px, keyboard-operable, and announces the destination theme.

The browser preference uses `easygas.theme`. An explicit Light/Dark choice takes precedence. The OS preference is consulted only for System; absent or malformed storage falls back to Light. Storage failures are caught. Changes synchronize through the browser storage event, including clearing storage. No account theme column or second theme provider was introduced.

A small pre-hydration script sets the root theme before the main page paints. The provider avoids replacing it with an initial default while it reads storage. Theme changes do not recreate cart, address, gas quantity, authentication or booking state. Administration and restricted staff workspaces use the same stored preference and header switch. Theme selection does not alter navigation, roles or privileges. The 30 October staff extension supersedes the previous administration light-only boundary.

`EASYGAS_DARK_MODE=false` is the emergency light-only switch. It forces light in the bootstrap and provider, hides theme controls, and preserves the stored choice for later re-enabling. Restart or rebuild the relevant runtime when changing this environment setting. No browser preference is shared with an external service.
