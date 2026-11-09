# EasyGas theme tokens

One root provider sets `data-theme` and `color-scheme`. Component styles use semantic tokens from `apps/web/app/theme.css`; administration deliberately resolves light. The normal light palette remains the default.

| Token | Dark value | Purpose |
|---|---|---|
| page | #071B16 | Page canvas |
| surface | #0C2921 | Cards and forms |
| raised | #10352A | Raised panels |
| input | #112D26 | Input fill |
| foreground | #F4F8F5 | Primary text |
| muted | #B4C8BD | Supporting text |
| primary | #65EF83 | Main action |
| primary-foreground | #062B16 | Action text |
| border | #638C74 | Input boundaries |
| ring | #8BFDAB | Focus indicator |

`THEME-CONTRAST` checks primary/muted text on all four dark surfaces (at least 4.5:1), action text (at least 4.5:1), input boundaries and focus (at least 3:1). This is token-level verification, not a claim that every possible screen meets WCAG. Browser inspection also corrected the benefit strip, customer navigation, authentication panel, booking descriptions and summary labels.

Transitions use 160 ms where applicable and respect reduced motion. The existing 15px text minimum is preserved. Photographs and product art are not inverted. The official HD logo remains unmodified and uses a light plate in dark mode. A separately supplied official reversed logo could replace the plate later; no unofficial logo was fabricated.


## Staff theme extension — 30 October 2026

The administration light-only boundary described in the original phase is superseded. All administration and restricted staff routes now share the root theme provider and header switch. See `docs/traceability/easygas-admin-theme-rtm.md` for current scope and executed evidence. Global light-only rollback remains supported.
