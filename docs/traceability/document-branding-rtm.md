# EasyGas email and invoice branding

Production NO-GO and Excel import hold remain unchanged. No real messages sent. No mobile build or server deployment.

| ID | Requirement | Status | Evidence / outstanding |
|---|---|---|---|
| BRAND-01 | Apply EasyGas logo and palette to every existing outbound email | PARTIAL | docs/branding/evidence/tests.txt, docs/branding/evidence/email-preview.html. Live inbox rendering in Gmail/Outlook/Apple Mail remains untested; no real email sent. |
| BRAND-02 | Brand order/service invoice and sandbox receipt PDF exports with HD logo, repeated page header/footer | VERIFIED_COMPLETE | docs/branding/evidence/tests.txt, docs/branding/evidence/invoice-preview.png, docs/audits/production-completion-evidence/invoice-synthetic.pdf.  |
| BRAND-03 | Brand on-screen and printable web invoices without altering financial records | IMPLEMENTED_UNVERIFIED | docs/branding/evidence/typecheck.txt, docs/branding/evidence/build.txt. Authenticated browser/light-dark/print visual acceptance remains untested in this phase. |
| BRAND-04 | Preserve security, original financial snapshots and safe mail delivery | VERIFIED_COMPLETE | docs/branding/evidence/tests.txt.  |

Implementation coverage: 4/4. Verified requirement coverage: 2/4. All four remain in the denominator. Detailed sources, controls, paths and gates are in the JSON companion. Tests: 4/4 pass; web typecheck and production build pass. PDF synthetic long invoice inspected across all three pages. HTML email preview uses synthetic content and a data URI solely for local review; actual mail uses CID attachment. Live mailbox rendering and authenticated web visual acceptance remain open.
