# Full-width web layouts

| Requirement | Implementation and acceptance evidence | Status |
| --- | --- | --- |
| WIDTH-01 · Support Desk fills its admin workspace | Removed the shared workflow width cap in `apps/web/app/globals.css`. Authenticated browser checks matched the available workspace at 390, 1280 and 1920px with no document overflow. | Verified locally |
| WIDTH-02 · Web page wrappers fill their available space | Audited route entrypoints and removed shared CSS and inline page caps across public, customer and admin layouts. Products filled its container at 1920px. Typecheck and 15 product UI and navigation tests passed. | Implemented. Remaining route-level browser checks pending. |

The shared shells provide the available width and gutters. Existing authorization continues to protect routes and records. Coverage is 2/2 implemented and 1/2 locally verified. Hosted acceptance remains open. See the [JSON matrix](full-width-web-rtm.json) for implementation paths and gates.

## Retail POS follow-up

Hosted POS and Support Desk measured 1,100px within a 1,596px workspace. Both local pages measured 1,596px at a 1,920px viewport and 358px at a 390px viewport. All 29 signed-in administration routes filled their content area in Chromium at both widths. Six public routes were checked for document overflow at both widths. The remaining customer routes and state variants still need browser coverage. The width fix has since been deployed to Vercel.

Hosted Chromium checked 74 route entries at each of 390px and 1920px without document overflow. All 29 administration routes matched their available content width, including POS and Support Desk at 358px and 1,596px. Public and customer checks covered document overflow. Additional page states and dynamic detail routes remain open.
