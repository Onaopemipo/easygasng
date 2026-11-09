# Fee quotation

`packages/business-rules/src/payment-fees.ts` accepts integer kobo and an explicit immutable policy. B=principal, F(G)=rounded percentage of gross plus applicable fixed charge, subject to cap. For customer absorption choose the smallest G satisfying G−F(G)≥B; C=G−B. Merchant absorption collects G=B, C=0. Zero B yields zero G/C/F. Never use B+F(B).

A fixed-fee waiver creates a discontinuity; binary search across the whole range is unsafe. Search both monotone intervals independently and choose the smallest valid solution. BigInt intermediate multiplication prevents floating-point fee drift. Bound maximum gross and reject invalid/minor-unit inputs. Policy includes bps, fixed kobo, waiver threshold, cap, rounding and absorption.

Tests use deliberately synthetic170bps/110kobo fixtures, not merchant-approved Paystack rates. Threshold/cap/minimality/rounding/zero/invalid/maximum fixtures and exact wallet principal passed. Public advertised rates are research context only (05-provider-validation). Current runtime policy is OFF, fee=null, pass-through approval=false. Independent owner/finance versioned approval, current provider dashboard automatic fees OFF and merchant approval reference are required before activation. Fee version changes invalidate uninitialized quotes; initialized transactions preserve accepted economics and are verified against their snapshot.

Customer web/native UI separates principal, processing charge and gross, requires explicit acceptance, displays expiry and uses only server totals. Wallet principal excludes C. Fees collected are not delivery charges or additional sales revenue. Actual fees are recorded separately; net estimate is never bank settlement.
