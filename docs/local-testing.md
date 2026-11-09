# Test the expanded EasyGas workflows locally

## Restart after this update

If the server is already running, stop it with Ctrl+C and restart:

```sh
npm run dev
```

The local development database applies the new migrations on startup. Existing business records are preserved. Do not rerun initial team setup when staff already exist. Open http://127.0.0.1:3003.

## Customer routes

- `/account-settings`: name, verification, password change, addresses, consent/quiet hours, session revocation, privacy requests and personal-data download.
- `/forgot-password`: queue a recovery message. `/reset-password` and `/verify-email` accept the one-time token from the local email link.
- `/support`: requests and conversation history.
- `/consumption`: refill-size profiles, estimates when sufficient verified history exists and feedback.
- `/notifications`: order/support/reminder/campaign notifications and read status.
- `/purchase-credit`: actual wallet ledger, programme status and reward conversion.
- `/schedules`: create and pause/resume plans.
- `/recurring`: explicitly authorise COD generation, set a maximum total, revoke or reschedule.

Passwords require at least 12 characters. Sensitive actions require password verification within five minutes. Password change/reset revokes sessions; sign in again.

## Staff routes and test journeys

1. `/admin/operations` → Catalogue: create/edit content as owner. A new product starts without stock, price or publication. Use Settings and independent approvals before selling it.
2. Operations → Purchasing: inventory/manager requests a purchase; a different authorised owner/manager/finance colleague verifies their password and approves; inventory receives against the actual invoice reference. Replaying receipt does not add stock again.
3. Operations → Cylinders: register a cylinder through the Cylinders page, then record inspection/fill/custody. A failed or overdue inspection prevents issue/filling.
4. Operations → Branches: create as verified owner; dispatch stock; a different eligible colleague at the destination confirms receipt.
5. Operations → Staff: invite by email, accept the local link, then grant staff access through the protected approval setting. Invitations themselves do not grant staff privileges. Owner suspension revokes live sessions.
6. `/admin/support`: reply, add internal notes, assign, resolve and close. Customers cannot read internal notes or other customers' requests.
7. `/admin/credits`: finance records actual cash received, then another verified owner/finance colleague approves purchase credit. Customer refunds require the customer's explicit wallet-credit consent and independent finance review.
8. Enable wallet spending through Settings/approvals. Customer checks out with sufficient credit; a cancellation restores the exact debit. For wallet-paid delivery, collect no cash and submit zero cash with the customer code.
9. `/admin/pos`: cashier opens a shift, records a cash sale, submits counted cash including the float. Different finance staff verifies a matching shift. Variances remain unresolved and unverified.
10. Configure loyalty through Settings/approvals. Points accrue on delivered verified product spend, not on order creation or delivery fees. Customer redemption creates purchase credit once; full refunds reverse earned points.
11. Enable recurring COD through Settings/approvals. The customer creates a plan, verifies their password and authorises quantity/address/window/maximum total. Maintenance generates due orders only within that ceiling. A failed occurrence is recorded once; review and reschedule instead of silently retrying forever.
12. `/admin/campaigns`: draft an in-app campaign for opted-in branch customers; a different owner/manager approves. Maintenance rechecks consent and quiet hours before delivery.
13. Operations → Delegations: request bounded publication/capacity authority for an eligible same-branch colleague; a separate owner reviews it. Financial/security keys cannot be delegated. Expiry/revocation invalidates scheduled approvals.
14. Operations → Maintenance: inspect job history or run maintenance after password verification. Background processing also runs every minute while the app is running.

Amounts explicitly labelled **kobo** use 100 kobo = ₦1. Standard price settings show naira.

## Local email preview

No email is sent externally. After queuing a verification, recovery or invitation message, stop the development server so the command can open its local database:

```sh
npm run mail:preview -- person@example.test
```

Copy the link, restart `npm run dev`, and open the link in the browser. Tokens expire and are single use. Treat these links like passwords. Preview does not falsely mark a message sent.

## Maintenance

The running application uses a one-minute in-process timer. It requires an active provisioned owner; setting `EASYGAS_BACKGROUND_JOBS=false` disables that timer. For local operator-only processing, stop the dev server first:

```sh
npm run worker -- --once
# Or keep an operator worker running, with the development server stopped:
npm run worker -- --watch
```

Embedded PostgreSQL has one process owner. For future managed PostgreSQL, the app and a separate worker may share the database, but production scheduling/monitoring still needs deployment configuration. Reminders respect Africa/Lagos quiet hours and customer preferences. Saved preference plans do not create orders without a separate recurring authorisation.

## Encrypted local backups

Stop the development server. Use an interactive terminal; passphrases are entered silently and must contain at least 16 characters:

```sh
npm run backup -- create
npm run backup -- verify .backups/<filename>.egbackup
npm run backup -- restore .backups/<filename>.egbackup .data/restores/acceptance-test
```

Restore creates a separate empty database and never overwrites the active business database. Protect and retain the passphrase separately. These commands do not certify a future managed-cloud backup system.

## Automated checks

```sh
npm test
npm run typecheck
npm run build
cd apps/mobile
npm run typecheck
npx --no-install expo export --platform ios --platform android --output-dir /tmp/easygas-mobile-check
```

106 tests passed in the 30 October execution (see `reports/easygas-test-results.md`). Tests use isolated databases. Native exports are JavaScript/Hermes bundles; they are not signed native releases.

External payment providers, email delivery, maps and app-store distribution remain unconnected. See `implementation-status.md` for unfinished scope and `production-readiness.md` for release blockers.


## Professional services and new administration

Open `/services` and `/bookings`; a fresh business database correctly shows no available published service until real configuration is approved. Use `/admin/services` for business/checklist proposals, `/admin/technicians` for verified qualifications and slots, `/admin/bookings` and `/admin/quotations` for operations, `/admin/incidents` for exceptions, `/admin/policies` for approved text, `/admin/bundles` and `/admin/recommendations` for governed offers, `/admin/reconciliation` for actual verified tender and `/admin/readiness` for open gates. Creating a draft does not manufacture stock, a qualification, a payment or safety clearance.

For a complete synthetic service walkthrough use the isolated fixture procedure in `testing.md`; it is separate from ordinary business setup. Customer and technician native views use the same APIs. Provider payment/email, native device/PDF/media/offline acceptance and real field qualification/safety approval remain unavailable or unverified as documented.
