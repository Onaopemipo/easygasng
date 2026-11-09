# Dark mode implementation report

A single root theme provider, early theme script and semantic tokens now serve public/customer pages. Light, Dark and optional System are browser preferences, with safe storage fallback, cross-tab changes and an intentional light-only admin boundary. Theme changes preserve cart, address, gas quantity, account and booking state. An environment flag supplies a reversible light-only rollback without deleting preferences or business data.

See [tokens](../design/easygas-theme-tokens.md), [route matrix](../design/easygas-theme-route-matrix.md), [preference behavior](../features/easygas-theme-preferences.md), [tests](../testing/easygas-dark-mode-tests.md), [blockers](easygas-dark-mode-blockers.md) and [rollback](../operations/easygas-dark-mode-rollback.md). Six actual responsive homepage screenshots and browser JSON checks are saved. The 15px minimum remains. Official photographs/logos are not inverted; the HD logo is preserved on a light plate in dark mode.

Local functional, route, responsive, keyboard, token-contrast, reload and cross-tab checks pass. Physical OS-theme-change emulation and first-paint timing traces were not claimed. No production LCP/INP/CLS result exists; DM-G10 remains BLOCKED. All other DM gates pass for the documented local scope. Production remains NO-GO and no deployment was made.

The [main report](easygas-homepage-redesign-implementation.md) records gate results, actual commands and remaining prerequisites; the [JSON/Markdown traceability](../traceability/easygas-homepage-theme-rtm.md) keeps partial and blocked scenarios visible.


## Staff theme extension — 30 October 2026

The administration light-only boundary described in the original phase is superseded. All administration and restricted staff routes now share the root theme provider and header switch. See `docs/traceability/easygas-admin-theme-rtm.md` for current scope and executed evidence. Global light-only rollback remains supported.
