# EasyGas native Mobile Next

The approved [private design](https://easygas-mobile-next.philipmuyiwa.chatgpt.site) is now being adopted in the real React Native application. This guide describes the implemented native controls. The private prototype remains a separate synthetic design reference. Installed TestFlight/Play builds do not receive source changes automatically; this phase has not created or uploaded a new binary.

## Customer and business customer

**Home** puts Order gas first, followed by Services, Wallet and the latest actual order. Invoices, cylinders, rewards and refill plans remain below. The five bottom tabs are Home, Orders, Services, Wallet and Account. Account → All workspaces opens the searchable feature directory. A guest sees no private balance or order records.

To order gas, choose cylinder capacity and quantity, then select **Delivery details**. Check recipient, mobile number, area, street, date and time. Optional delivery directions expand only when needed. Saved addresses open in a sheet. Select **Review order**, choose an available payment method and confirm the server quotation. The application rechecks the quote before creating the order. If the price changes, review the new amount and confirm again.

The fixed footer holds the current total and one primary action. Back returns to the previous step. Signing in from checkout preserves the in-memory guest draft; private saved drafts and pending requests are encrypted and bound to the signed-in account. A failed storage check preserves existing records and stops a new submission.

If a request times out, **Retry saved request** uses the original request key and payload. The same pending request survives reopening the checkout. Check Orders before starting a different purchase. An unknown response does not mean failure or an unpaid order was deleted.

For card payment, review the order amount, processing fee and exact total. **Accept total & continue** provides the fee consent and opens the approved hosted checkout. The app verifies the opaque intent using its own signed-in session on return or foreground. A browser session is separate from the app session. Pending status never means paid. A failed or expired attempt returns to a fresh payment review; it does not silently start another charge. Saved attempts must match the exact order/invoice/service being paid. Sandbox disclosures and existing server controls remain in force.

Orders open into tracking and focused payment, visit, refund and cancellation-request sheets. **Request cancellation** creates a support request linked to the owned order; the order remains active until authorised operations confirms cancellation. Delivery codes are shown only for the owned active order and should be shared after receipt. Tracking displays actual server events and timestamped observed locations.

Products use search and category sheets. Product details keep specifications, warranty, compatibility and safety in a secondary sheet. The cart supports quantity changes and removal, followed by the same delivery/review flow. Gas products open the refill flow. Bundled products and staged appointments retain their distinct delivery, quotation, payment and completion records. A service-only linked request also retains its original key across an uncertain response.

Services show available service cards. Select a service to review current terms, eligibility and appointment availability. Bookings and quotation decisions open one appointment at a time. Wallet shows the current ledger balance and entries; **Add money** opens a separate amount/payment sheet. Refunds, credits, work authority and publication consent keep their existing business approval rules. Feedback drafts are available from All workspaces → Testimonials; submitting for review does not publish them.

## Business owner, service manager and finance

Overview presents confirmed records and values; unavailable values remain unavailable. Work opens the permitted workspace directory. Each business workspace has **Overview**, **Actions** and **Activity**. Activity uses available canonical history/movement records; it does not manufacture an audit trail where the module has none.

Select one record to inspect it. Open an action row for a focused form. Searchable record selectors, current revisions, required evidence and password verification remain part of the real workflow. Closing a sheet keeps unsubmitted entries in that form while its component remains mounted. Reopening a workspace revalidates recent data. After a write, the controller requires canonical read-back before another action; an unknown outcome is not treated as success.

Owner-only settings, approvals, staff authority, reports and readiness remain restricted. Manager and finance access stays within their existing privileges and branches. The owner is not split into invented additional admin roles. Existing independent-review controls are not removed by the redesign.

## Driver and technician

The stable bottom tabs are **Today**, **Deliveries/Jobs**, **Work** and **Profile**. Today shows actual assignments and readiness. Work groups operational actions and activity. Profile keeps personal details, security, appearance, notifications, synchronisation and support.

Drivers open Trip for trip records, LPG or Products. Start a suitable trip before accepting an eligible delivery. Vehicle suitability/capacity, branch, availability, qualifications, inspections, pickup, arrival, proof, code, cash verification and returns remain server-controlled. Trip/LPG/manifest forms open in focused sheets. A pending encrypted offline record never marks delivery complete.

Technicians open the assigned job, inspect current assessment and scope, then use the existing authorised work/material/completion controls. No eligible assignment, expired qualifications or changed work authority remain blocking states. Offline evidence stays pending until server verification. Changing roles or signing out does not discard pending custody records.

## Loading, appearance and acceptance

Recent private reads are scoped to the current account/session and revalidated. Fast navigation avoids a repeated branded loader; slower content uses a consistent delayed skeleton. Foreground revalidation, connection errors and retry actions remain explicit. Page transitions respect Reduce Motion. Transparent artwork and approved light/dark colours are shared across the app. Content remains edge-to-edge with safe-area and keyboard handling.

Current source/API/component results and the still-open phone/tablet, accessibility, hosted positive purchase/replay and distribution checks are recorded in the [native adoption matrix](../traceability/mobile-native-next-rtm.md). Browser prototype screenshots are design evidence, not native device acceptance. Production NO-GO, genuine safety/provider acceptance and historical import/retention holds remain unchanged.

## Recovering linked appointments

If the app loses the response after you confirm appointments, reopen the saved checkout and select **View linked requests**, then **Retry saved request**. The same request reference recovers the original appointments. The app preserves other products in your cart. **View appointments** opens your bookings; **Track your order** opens the saved product/gas order.

The current design is visible in the development simulator. Store-installed versions remain on their previously uploaded binaries until a separate release is built and distributed. Role, tablet, keyboard and provider acceptance remain tracked in the native traceability matrix.

![Current native Home](../mobile-native-next/evidence/native-home-phone.png)

The supporting web/API changes are deployed to the [client demo](https://easygas-client-demo.vercel.app). Seven-role access and exception probes passed on both the candidate and stable demo. Successful hosted physical-product checkout still needs eligible stock; the current zero-stock catalogue correctly blocks that purchase. No hosted test order or real payment was created during these read-only checks.

## Account and keyboard checks

When signed out, Account shows one **Sign in** action plus Appearance, Policies & terms, and About & delivery. Signing out removes private balances and orders from Home.

Profile, email verification, communication preferences and privacy password checks open focused sheets. Open one action, enter the fields, then continue. Closing a sheet does not submit it. In the verified phone layout, the software keyboard leaves the active input and Continue button visible.

The actual phone journey from guest delivery details through sign-in, synthetic wallet payment and the correct order tracking is recorded in [device observations](../mobile-native-next/device-observations.json). Payment verification does not mark delivery complete.
