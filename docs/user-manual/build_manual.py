"""Rebuild the illustrated manual with the bundled Codex Python runtime."""
from pathlib import Path
import json, re
from PIL import Image
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_TAB_ALIGNMENT, WD_TAB_LEADER
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT

ROOT=Path(__file__).resolve().parents[2]
BASE=ROOT/'docs/user-manual'
BUILD=BASE/'build'
OUT=ROOT/'output/manual'
BUILD.mkdir(exist_ok=True); OUT.mkdir(exist_ok=True)

# Each topic is deliberately a single printable reference page. Exact UI labels
# are in body text; headings remain plain words. Observed empty states stay true.
topics=[]
def topic(title,who,where,intro,steps,check,blocked,shot=None,caption=None,sub=None):
    topics.append(dict(title=title,who=who,where=where,intro=intro,steps=steps,check=check,blocked=blocked,shot=shot,caption=caption,sub=sub))

topic('Choose your workspace','All users','Sign In',
 'EasyGas uses one sign-in. Your account determines the workspace and permitted actions. There is no role picker. EasyGas has one Admin who is also the business owner; staff use their own limited accounts.',
 ['Customers land in their account and shop, manage orders, request services and view their own balances.',
 'The Admin runs the business. Service Managers coordinate customers, orders, dispatch and service operations within their branch scope.',
 'The Inventory role includes permitted stock and finance work. Drivers use Deliveries; Technicians use Service Bookings and Professional Services.',
 'Use an individual account. If the wrong workspace opens, sign out and use the correct account; ask the Admin to review access when needed.'],
 'Your visible menu and returned records match your role and authorised branches. A visible page does not grant every action on it.',
 'A permission error is not a reason to share the Admin password or create a second Admin. Record the page, task and account role for the owner.',
 sub='Role names in this guide follow the product. Internal identifiers owner, manager and finance mean Admin, Service Manager and Inventory respectively. Individual privileges can narrow access further.')

topic('Sign in and find your way','All users','/login and your workspace',
 'Use the email address or phone number registered to your account and your existing password. Staff and customers use the same sign-in page.',
 ['Open the client demo and choose Login / Sign Up. Enter your email or phone number and password, then choose Sign In.',
 'Choose the required menu from the sidebar. The active business menu remains visible as you move between sections. Collapse the sidebar for more working space.',
 'Use the top search for permitted records. Local page search and filters narrow the current list; clear them before assuming a record is missing.',
 'Use tabs to switch views and Review or Details to open a record. Close a dialog before changing workspace. Sign Out when you finish on a shared device.'],
 'The workspace header identifies your account and role. Business amounts use NGN and operational dates use Africa/Lagos.',
 'Use Forgot your password for password recovery. For an expired email verification link, sign in and request a new verification email from Account & privacy. Keep invitation and recovery links private.',
 'sign-in','The shared sign-in page. No credentials are included in this manual.')

topic('Browse products and services','Customers','Products and Book a Service',
 'Choose your delivery location before comparing availability. The catalogue separates gas refills, empty cylinders and professional services; buying one does not automatically include the others.',
 ['Open Products and select a category or search. Open the item to read its size, price, availability and description.',
 'For gas refills, continue to Order Gas to configure the requested quantity and delivery. A nominal cylinder capacity is guidance, not a measured fill.',
 'For physical products, add an available item to the cart and review its quantity before checkout. An unavailable item cannot be promised from a warehouse total alone.',
 'For a service, open its detail page and read inclusions, exclusions, preparation and coverage before selecting Book service.'],
 'The selected product or service, location and quoted scope match the customer need. The final quotation is authoritative.',
 'Out of stock can reflect sellable and eligible stock, not simply all units physically held. Ask support about availability; do not substitute an unapproved cylinder or service.',
 'public-products','The current eight-item catalogue. Availability and prices can change.')

topic('Prepare a gas order','Customers','Order Gas at /gas-order',
 'Request the gas quantity you need for each cylinder and give a complete delivery address. The form calculates a current quotation before you commit.',
 ['Choose the cylinder capacity guidance and enter Requested gas in kg. Use Add another cylinder only when the delivery includes another cylinder.',
 'Select the delivery location and enter the full house address, including useful access details. A supported area name does not verify every address inside it.',
 'Choose the delivery date and available delivery window. Check every cylinder quantity and the delivery fee in the order summary.',
 'Select the offered payment method, then choose Review quotation. Continue only after the server has confirmed the current price and availability.'],
 'The review matches your cylinders, gas quantity, address, window and payment choice. No delivery is complete just because the order has been placed.',
 'If location, capacity, date or stock is rejected, correct that field or contact support. Never increase a nominal cylinder size to force an unsafe quantity through.',
 'customer-gas-order','Gas configuration and quotation. The screenshot is an unsubmitted demo form.')

topic('Review checkout and payment','Customers','Quotation review or Cart then Checkout',
 'Review the actual payable amount and the order terms before placing an order. Card, Cash and Wallet are separate choices when offered by the current configuration.',
 ['Confirm the customer, full delivery address, date, window, item quantities and delivery charge. Saving delivery details for later is a separate optional choice.',
 'For Wallet, check the available purchase credit and confirm the specific order debit. For Cash, follow the collection terms shown. Card payments continue through the configured payment provider.',
 'Submit once and wait for the result. Keep the order reference and any payment reference. A payment return page alone does not prove that a payment was verified.',
 'Open My Orders after submission. If a provider response is pending, use the existing reference and support process rather than starting duplicate payments.'],
 'An order confirmation and verified payment status, where payment is required, are separate pieces of evidence. An invoice is not a receipt.',
 'Missing-link payment pages require the original complete link. The demo uses synthetic records and sandbox providers; this guide does not authorise live payments.',
 sub='Illustrative demo quotation: 6 kg at NGN 1,800 per kg is NGN 10,800, plus NGN 5,000 delivery, totalling NGN 15,800. Use the current on-screen quotation for every real decision.')

topic('Track and review your orders','Customers','My Orders at /orders',
 'My Orders is the starting point for an existing purchase. Search for the reference, use the status filters and open the specific order before taking further action.',
 ['Open My Orders from your account. Clear old filters if the order you expect is missing.',
 'Select the order and review its items, total, payment and delivery information. Use any invoice or receipt action associated with that order.',
 'Use tracking to follow recorded progress. A driver assignment or an available driver is not proof of live GPS, an accurate ETA or physical arrival.',
 'Request a supported change, cancellation or help from the order context when offered. After dispatch, changes can require a separate delivery or reviewed correction.'],
 'Read the latest canonical status and payment record. Retain the order reference when contacting support.',
 'Do not treat a missing ETA as a failed delivery. If payment is uncertain, an address is wrong or the driver cannot complete safely, contact support before reordering.',
 'customer-orders','The customer order list presents compact records and contextual actions.')

topic('Request and manage a service visit','Customers','Book a Service and Service bookings',
 'A preferred visit time is a request. EasyGas confirms scheduling and qualified provider arrangements before the visit; the current preferred-time request does not collect payment.',
 ['Open the service detail and read the price basis, scope, exclusions and preparation. Choose Book service while signed in.',
 'Enter the requested location, address and preferred future visit time. Add relevant symptoms or access information without including account passwords or payment secrets.',
 'Review and submit the booking request once. Open Service bookings to follow the request and any confirmed arrangements.',
 'Review any later assessment quotation, added materials and revised charges. Approve only the latest scope you understand; completed work and the service report are later steps.'],
 'The booking appears with its current request or scheduling state. A request is not a guaranteed slot, accepted quote or permission to start paid work.',
 'Change the preferred time or cancel when the booking allows it. If no qualified provider is available, wait for confirmation instead of assuming the request has been accepted.',
 'customer-service-request','Service detail and Book service entry. The service request and subsequent work authorisation are separate.')

topic('Use your wallet and purchase credit','Customers','My Wallet and Credit and Redemption',
 'Your wallet is an account balance backed by recorded transactions. Funding, order spending and refunds each have their own verification and approval steps.',
 ['Open My Wallet to see your available balance and transaction history. Check the reference and reason on each entry.',
 'Use the offered top-up flow and review the funding principal, provider fees and total charged. Do not assume all of a fee-inclusive payment becomes spendable credit.',
 'If a bank-transfer route is offered, provide the actual payment reference and evidence. Wait for independent verification before expecting the balance to increase.',
 'At checkout choose Wallet explicitly for that order. For a disputed debit or refund, quote the original order and transaction reference to support.'],
 'Only verified credits affect the available balance. Pending funding and a submitted refund request are not completed credits.',
 'Do not repeat a top-up because a return page is slow. Ask support to trace the original payment. Keep provider receipts and private account details out of public messages.',
 'customer-wallet','Synthetic customer balance and transaction history. The figure is an example, not a promised balance.')

topic('Understand EasyRewards','Customers and Admin','EasyRewards and Approval Centre',
 'Points history, policy approval and programme activation are different. In the audited demo, rewards earning, redemption and referrals remain disabled; historical records are retained.',
 ['Customers can open EasyRewards to review the current programme message and any existing points history.',
 'Read the currently published rules before expecting points or a discount. An old points balance does not establish that redemption is enabled today.',
 'The Admin reviews policy changes in Approval Centre. Requested by identifies the author; it does not mean that author has already approved the request.',
 'After a decision, check the request state and the effective programme controls. A policy proposal or approval alone does not demonstrate activation of all rewards features.'],
 'The customer screen and effective policy controls agree. The named EasyRewards proposal remained Awaiting owner approval at the audit.',
 'Do not promise points or apply a manual discount to work around disabled programme controls. Escalate an inconsistency to the Admin with the affected reference.',
 'customer-rewards','The customer rewards page shows the current programme state and retained history.')

topic('Manage gas profiles and refill plans','Customers','Cooking Gas Profiles and refill menus',
 'Profiles and forecasts help plan purchases. Verified delivered gas purchases are purchase records; they are not measured household consumption.',
 ['Use Cooking Gas Profiles to maintain the supported household or cylinder information and inspect the history available to your account.',
 'Use consumption views as estimates. Compare the assumptions with your actual use and update the profile when your circumstances change.',
 'A refill schedule or reminder helps you remember a purchase. A recurring order requires its own explicit authorisation, limits and valid payment arrangement.',
 'Before authorising recurring activity, verify your password when requested and review quantity, timing, budget and cancellation controls. Monitor each resulting order.'],
 'The plan clearly states whether it is a reminder or an authorised recurring order. An empty profile produces an empty planning view rather than an invented forecast.',
 'If no profiles exist, create an appropriate profile first or place a normal one-off gas order. Do not regard a reminder as a payment mandate.',
 sub='Smart Refill, Refill Plans and Recurring orders serve related but different tasks. Use the displayed plan status and explicit authorisation record as the source of truth.')

topic('Manage account privacy and support','Customers','Account and Privacy and Support',
 'Keep contact details and saved addresses accurate. Profile, addresses, security, notification preferences, privacy requests and reviews are grouped into focused account sections.',
 ['Open Account and Privacy, choose the relevant section, then edit only the details you need. Review saved-address changes before using them for a new order.',
 'Use security controls for password verification and session management. Do not share your password, handover code or recovery link with support.',
 'Open Notifications for messages intended for your account. Use Support to open a conversation about the relevant order or booking and follow its replies.',
 'When sharing a review, check the feedback, rating and publication consent. Moderation approval and publication are separate actions.'],
 'The saved result appears in the chosen section. A privacy request is an intake record; it is not evidence that all data has already been erased.',
 'Use Help or Contact Us if your normal support page is unavailable. Customer Policies now publishes nine approved client-demo notices. These exclude real sales; commercial policy approval is still required before real operation.',
 'customer-account','Account and Privacy keeps common tasks in separate sections.')

topic('Run the daily business review','Admin and Service Manager','Dashboard and Orders',
 'Start with operational priorities, then work from the actual order or booking. Dashboard summaries help identify work; they do not replace the underlying records.',
 ['Review new orders, payment issues, unassigned deliveries, open support and service requests for the permitted branch.',
 'Open Orders and use search and status filters. Select Details for the exact customer reference before accepting, correcting or escalating anything.',
 'Check customer identity, delivery address, items, quotation and payment separately. A verified payment does not prove stock, inspection or driver readiness.',
 'Record supported actions once and refresh the record after success. Use the current state and role-specific controls to determine the next step.'],
 'Accepted work has the necessary commercial and operational prerequisites. Unavailable profit or valuation fields remain unavailable until cost evidence is complete.',
 'If a record is outside your branch or permissions, escalate to the Admin. Do not duplicate an order merely because it is hidden by a filter or role scope.',
 'admin-dashboard','Business Overview and priorities. Synthetic figures are time-bound audit examples.')

topic('Use the compact order details dialog','Admin Service Manager and permitted Inventory staff','Orders then Details',
 'The redesigned order dialog keeps the reference and summary visible while separating the record into Overview, Items, Payment and History.',
 ['Use Overview for the customer, address, delivery window, current order status and assignment summary.',
 'Use Items for quantities, price basis, inspection and original line details. Compare the authorised quantities before proposing any change.',
 'Use Payment for payment state and the invoice action. Check verified payment evidence rather than treating the order total as money received.',
 'Use History for the timeline and visit evidence. Open a contextual action only when the current state permits it, then return to the record after submission.'],
 'The action is attached to the correct order and updates its authoritative state. Delivered orders keep their historical evidence and do not expose routine pre-dispatch additions.',
 'An unavailable action can be intentional. Paid or invoiced changes require the correction process; dispatch-stage additions may require a separate delivery.',
 'admin-order-detail','A delivered QA order in the compact Overview tab. This audit did not modify the order.')

topic('Coordinate dispatch and staff','Admin and Service Manager','Deliveries and Drivers',
 'Dispatch combines order readiness, driver eligibility, capacity and location evidence. An availability preference alone does not mean a driver is online, nearby or qualified.',
 ['Open Deliveries to review accepted or preparing orders awaiting assignment. Inspect the customer address and coverage evidence.',
 'Check the intended driver, operational status, assigned work, vehicle and required current qualifications. Resolve conflicts before assignment.',
 'Assign through the order or dispatch action when eligible. Follow acknowledgement, inspected pickup, travel, arrival and delivery progress.',
 'Use Drivers for permitted directory and availability work. Escalate failed or stalled delivery activity with its order and trip references.'],
 'The intended driver receives the assignment and the order records the assignment. A recorded map point can be stale; an unknown ETA must stay unknown.',
 'Do not assign around expired calibration, missing qualifications, unverified address coverage or unresolved custody. The demo-only renewal is temporary; check its current expiry before every journey.',
 'manager-dispatch','The Service Manager dispatch view. Availability, location and fulfilment states are separate.')

topic('Create staff assisted sales','Admin Service Manager and permitted Inventory staff','Retail POS and Customers',
 'Retail POS supports staff-assisted sales using the same authoritative pricing, customer, stock and payment controls. It does not remove delivery or safety prerequisites.',
 ['Identify the customer or use the supported customer creation flow with accurate contact information. Avoid duplicate customer records.',
 'Select the sale items and quantities. Check stock eligibility, current price and whether the sale is a retail handover or delivery.',
 'Review the invoice or payment route actually offered for the sale. Record money received only when it was actually collected.',
 'Retain the sale reference and complete any required fulfilment and independent payment verification. Use Support Desk to manage subsequent issues.'],
 'The sale has a customer reference, correct items and an accurate payment state. Invoice issuance and receipt verification remain distinct.',
 'The audited POS view showed the current till state. Follow its open/close and reconciliation prerequisites; do not create a new sale to bypass a closed till or insufficient stock.',
 'admin-pos','Retail POS entry and till controls. No sale or till change was submitted during the audit.')

topic('Start a driver shift and trip','Driver','Deliveries then Home',
 'The driver web workspace has Home, Orders, History and Profile. Home shows the shift and assigned work; availability is a dispatch preference.',
 ['Check your assigned account and branch. Review Home and Orders before changing shift or trip state.',
 'Use Start trip when ready. Select the actual vehicle and enter the observed starting odometer; never guess a reading.',
 'Review the optional trip-location consent. The current web dialog explicitly says this page does not record GPS; consent is not a device permission grant.',
 'Start the trip only when operational prerequisites are satisfied. Use Profile for account and qualification information and History for completed work.'],
 'An active trip identifies the actual vehicle and starting reading. A web trip record does not establish native background GPS or online presence.',
 'If vehicle or qualification checks fail, stop and contact dispatch. Never borrow another driver identity or renew expired evidence without authorised review.',
 'driver-home','Driver Home with the four workspace tabs and current availability preference.')

topic('Complete an assigned gas delivery','Driver and qualified operations staff','Orders then the assigned delivery',
 'Follow the current order controls in sequence. This is an application guide, not physical LPG handling training; only qualified personnel perform inspection, loading and dispensing.',
 ['Acknowledge the assignment and inspect the authorised quantities. Qualified staff record inspection and issue the measured vehicle load using valid equipment and evidence.',
 'Acknowledge LPG custody with actual observations, then confirm inspected pickup. Follow the travel and arrival controls for the correct customer address.',
 'Save metered dispensing using actual meter and cylinder evidence. Resolve any held change or quantity exception through the approved process before handover.',
 'Record cash actually collected when applicable. Upload the permitted proof photo with consent, enter the customer handover code privately and complete delivery only when all guards pass.'],
 'The order reaches Delivered with verified required evidence. The original invoice, payment and receipt remain traceable to the same reference.',
 'Expired calibration, missing custody, invalid quantity, missing proof or a wrong handover code must block completion. Ask dispatch to resolve the cause; do not substitute synthetic evidence in real operations.',
 sub='The customer code is not a note field. Do not include it in a photograph, shared screenshot, support message or public report. Approved photo formats and size limits are shown by the upload control.')

topic('Handle driver exceptions and close the trip','Driver Inventory and dispatch','Delivery actions and Manage trip',
 'An unsuccessful delivery does not automatically settle the gas, cylinder or cash custody. Close operational records only after the physical position and financial evidence agree.',
 ['If the customer is unavailable, the address is unsafe, payment is disputed or delivery cannot continue, record the supported exception and notify dispatch.',
 'Use the governed return process for undelivered gas or products. Inventory staff confirm the actual returned quantities and resolve differences independently.',
 'Finance verifies recorded cash against receipts. A driver collection entry is not independent finance confirmation.',
 'End the trip after all required original and supplementary custody is reconciled. Enter the actual ending odometer and review any outstanding work.'],
 'Trip closure leaves no unresolved custody or collection obligation. History provides completed records without deleting the original exception trail.',
 'Do not force a Delivered status for a failed visit, enter zero returns without checking physical stock, or repeatedly submit a blocked trip close. Escalate the specific outstanding guard.',
 'driver-trip','The trip dialog separates vehicle, odometer and optional consent. It was opened for inspection only.')

topic('Use the technician workspace','Technician','Service Bookings',
 'Technicians use Home, Jobs, History and Profile. The web workspace shows assigned work within your account scope; availability and qualifications remain separate.',
 ['Review Home for assigned, active and upcoming work. Open Jobs and choose a current assignment before taking any job action.',
 'Read the customer issue, address, scheduled arrangements and authorised scope. Accept or decline only through the offered assignment controls.',
 'Use Profile to review qualification information and working arrangements. A qualification document or preference does not by itself authorise every kind of work.',
 'Use History for closed jobs and reports. Keep customer evidence inside the authorised job record.'],
 'Your Jobs and History reflect your own assignments. In the audited technician account both lists were empty; the manual does not fabricate a live job.',
 'The Home Contact support shortcut opens the public Contact Us page and its contact information. Customer support conversations remain restricted; technicians do not gain access to customer messages.',
 'technician-home','Technician Home separates assigned work, availability, eligibility and quick actions.')

topic('Assess quote and complete service work','Technician and Service Manager','Assigned service job and Quotations',
 'Assessment, quotation, approval, payment, work authorisation and completion are separate stages. Use the latest approved scope and version.',
 ['Record the visit assessment and proposed scope. Submit the latest quote for independent business approval when required; the customer must approve the applicable quotation.',
 'Wait for payment and work authorisation required by the job. Start authorised service work only after the current guards pass.',
 'Issue approved materials, record actual usage and confirm physical returns and reconciliation. Additional work requires a revised, approved scope.',
 'Record findings, safety checks and permitted photographs. Submit the immutable service report, then follow customer acknowledgement, concern or reviewed settlement/refund steps.'],
 'The final report, used materials, customer response and financial close relate to the authorised job. A report cannot be casually rewritten to hide a prior outcome.',
 'If scope changes, a customer raises a concern or a safety prerequisite fails, pause the affected work and escalate. An exception settlement or refund proposal is not immediate financial execution.',
 'technician-profile','Profile exposes current qualification information; job authorisation still controls what work may begin.')

topic('Manage physical stock and cylinders','Inventory and authorised operations staff','Inventory and Cylinders',
 'Warehouse balance, available stock, reservations, quarantine and inspected cylinder eligibility are different measures. Use the appropriate record before promising supply.',
 ['Review the branch inventory and low-stock alerts. Use the movement history to understand receipts, issues, transfers and corrections.',
 'Record Add Stock or a supported movement with the true quantity, branch and evidence. A purchase request or supplier invoice does not prove goods were received.',
 'For tracked cylinders, use the serial and inspection records. Keep failed or quarantined units out of sellable or dispatch-ready stock.',
 'Use an approved transfer workflow for branch movements and confirm actual receipt at the destination. Export only the stock data you are authorised to handle.'],
 'Physical counts and recorded movements reconcile. Product availability reflects eligible stock rather than a manually promised quantity.',
 'Investigate a discrepancy with Inventory and the Admin. Do not change a catalogue number to compensate for missing physical stock or fabricate an inspection result.',
 'finance-inventory','Inventory combines physical products and bulk gas information. Unavailable valuation is not zero value.')

topic('Control bulk gas and purchasing','Inventory and qualified operations staff','Inventory and Operations Centre',
 'Bulk LPG is controlled through measured receipt, vehicle issue, custody, dispensing and return reconciliation. Equipment and qualifications must be valid at the time of operation.',
 ['Review bulk gas balances and movement evidence for the authorised branch. Observe the units: the system stores measured quantities in grams and often displays kilograms.',
 'Check the current meter calibration and required staff qualifications before receiving, loading or dispensing. Active equipment can still have expired calibration.',
 'Record measured quantities and references through the actual operational action. Reconcile issued, dispensed, returned and exceptional quantities without inventing a balancing figure.',
 'Use Operations Centre for suppliers, purchases and transfers. Request, approval, receipt and payment are separate events; inspect each state before progressing.'],
 'Recorded physical custody and authorised financial evidence agree. The authoritative server rejects work whose safety prerequisites are no longer valid.',
 'The approved synthetic QA meter and four staff qualifications expire at 18:31 UTC on 19 November 2026, or 19:31 Lagos time. This is 04:31 Brisbane time on 20 November. After expiry, stop and obtain a new authorised review. This is not physical safety certification.',
 'admin-operations','Operations Centre provides governed purchasing and operational workflows.')

topic('Reconcile payments and documents','Inventory finance staff and Admin','Financial Reconciliation',
 'Financial Reconciliation separates invoices and receipts, the payment ledger, cash reconciliation, service costs and Paystack collections.',
 ['Choose the relevant tab and filter by the original order, reference or period. Confirm the customer and branch before reviewing amounts.',
 'Issue an invoice from the authorised order snapshot when required. Use a receipt only for the actual verified payment; neither document substitutes for the other.',
 'Review provider collections against the original provider reference. Investigate pending or failed verification before recording another payment.',
 'For corrections, refunds or voids, follow the governed request and independent execution path. Preserve the original documents and audit trail.'],
 'Each amount has an identifiable source, authorisation and verification state. A cancelled prepaid order may still need separate document and refund handling.',
 'Do not credit a wallet and also refund the provider for the same amount without the approved reconciliation. Missing cost inputs can make profit unavailable; do not report that as zero profit.',
 'admin-reconciliation','Reconciliation tabs keep invoices, ledger entries, cash and provider collections separate.')

topic('Verify cash and handle credits','Inventory finance staff and Admin','Cash reconciliation and Credits and Refunds',
 'Cash collection must be verified by a different eligible finance reviewer. Credits and refunds require a specific customer, amount, reason and authoritative evidence.',
 ['Open Cash reconciliation and find the collection by order or receipt reference. Review the recorded collector, amount and actual receipt evidence.',
 'Have the independent eligible reviewer confirm the collection. Use Include verified collections to examine completed entries rather than recording the same cash again.',
 'For a credit or refund, select the correct customer and authorised branch, enter the amount and reference evidence, and submit the appropriate request.',
 'Track approval and execution separately. Check the eventual ledger and customer balance before telling the customer that funds are available.'],
 'The collector and verifier are distinct when required. A submitted request is visible in its current pending, approved or completed state.',
 'The sole Admin model does not waive restricted financial review. If the necessary independent eligible staff are unavailable, hold the action and have the owner resolve the operating arrangement.',
 'finance-cash-reconciliation','Current cash reconciliation has no collections awaiting review. Empty state is not evidence of a new reconciliation.')

topic('Generate and interpret reports','Admin Service Manager and permitted Inventory staff','Reports and Analytics',
 'Reports use committed business records within your role and branch access. Select the report you need before adding relevant filters.',
 ['Open Reporting centre and choose the report type, authorised branch and date range. Use product, order or payment filters only when relevant.',
 'Generate the report and inspect its period, row count and source meaning. Current inventory and liabilities are point-in-time views.',
 'Export CSV, Excel XML or Print / save PDF when offered. Check the column headings and units before moving values into another spreadsheet.',
 'Distinguish gross sales, verified collections, liabilities and profit. A displayed Unavailable means the calculation lacks required evidence, not a numerical zero.'],
 'The exported scope and period match the on-screen report and your permitted records. Monetary export fields can be in kobo; confirm the stated unit before converting.',
 'If a report is empty, check filters, period and committed source records. Do not import or fabricate transactions to make a dashboard appear complete.',
 'admin-reports','Report selection is separate from generated results and saved reports.')

topic('Manage campaigns and recommendations','Admin and permitted Service Manager','Campaigns Recommendations and Testimonials',
 'Growth tools use record lists and focused creation dialogs. Delivery eligibility, the required approval authority and customer consent remain part of the workflow.',
 ['In Campaigns, open New campaign, define the relevant audience and message, review the draft and follow approval and delivery actions.',
 'Delivery rechecks customer marketing consent, account eligibility and configured quiet hours. The current flow describes in-app messages; it is not proof of an external email or SMS delivery.',
 'In Recommendations, propose the product and service relationship with supporting rationale and specification evidence. Follow independent review before using the rule.',
 'In Customer Testimonials, review authentic submitted feedback and consent. Approval and publication are separate; use performance views only after meaningful data exists.'],
 'An approved suggestion does not automatically add a paid item. Published feedback is traceable to a real submission and permitted publication consent.',
 'Do not seed invented testimonials, bulk message opted-out customers or treat a draft campaign as delivered. Ask the Admin to review the current programme and publication settings.')

topic('Review approvals as the single owner','Admin and eligible reviewers','Approval Centre',
 'Requested by identifies who submitted a change. Review opens its details. Approve is the explicit decision inside the request, subject to identity, version and eligibility checks.',
 ['Search for the exact request reference and read its requested change, scope, requester, risk, progress and current version.',
 'For the sole-owner EasyRewards policy path, the audited screen shows Awaiting owner approval · 0/1. This is the existing scoped owner-authority route, not a second Admin requirement.',
 'Verify identity when required, inspect the evidence and use the available decision action. Request changes or reject when the evidence is insufficient.',
 'After approval, inspect whether the change is approved, scheduled, activated or awaiting independent execution. Check the effective setting rather than assuming immediate activation.'],
 'The decision count reflects valid decisions for the current revision. Restricted dual-review requests show their actual progress, such as Awaiting approvals · 0/2.',
 'Financial, access, payment and qualified safety changes retain their independent controls. Do not create fake reviewers or a second owner to satisfy a count. Hold and resolve staffing or authority through the proper process.',
 'admin-approvals','The named EasyRewards request remains pending at 0/1. No approval was submitted in this audit.')

topic('Maintain staff settings and public policies','Admin and authorised staff','Staff Management Settings and Customer Policies',
 'Keep the small-company structure explicit: one Admin/business owner with separately authorised operational staff. Settings and public policy publication can require governed review.',
 ['Use Staff Management to invite or manage an individual with the minimum appropriate role, branch and privileges. Check delivery of the actual invitation; a queued invitation is not proof of inbox receipt.',
 'Review suspension or role changes against active assignments and required independent reviewers. Preserve historical ownership and audit records.',
 'Use Settings for the actual organisation, pricing and permitted controls. Review submitted changes in Approval Centre and confirm their effective state.',
 'Use Customer Policies to prepare, review and publish the appropriate approved versions. Then open the public links and verify that the intended current text is visible.'],
 'Staff permissions and published customer information reflect approved business decisions. An approved draft policy is not necessarily the published version.',
 'Nine approved demo-only notices, including Delivery Policy, are published. The existing owner authority permits Apply reviewed policy where eligible; restricted financial, access and qualified safety changes retain separate review controls. Commercial policy approval remains outstanding.',
 'admin-staff','Staff Management shows scoped roles and invitation states. It does not require multiple business owners.')

topic('Handle incidents and release readiness','Admin and responsible operational staff','Operational Incidents Audit History and Launch Readiness',
 'Record and resolve issues with evidence. Launch Readiness currently states Production readiness · NO-GO; a successful demo does not remove commercial launch gates.',
 ['Open Operational Incidents, locate the affected record and document the actual impact, severity and responsible owner. Follow the available acknowledgement and resolution workflow.',
 'Use Audit History to trace authorised actions, request decisions and changes. Retain original references and evidence rather than rewriting history.',
 'Review Launch Readiness with the relevant operational, security, provider and business owners. Supply current evidence for each open gate.',
 'Before commercial use, resolve the outstanding release, policy, physical, provider and operational controls. The existing actual-import hold and retain-all decisions remain in force.'],
 'A closed incident has evidence of resolution, and a passed gate has its required acceptance evidence. Current demo availability is not commercial approval.',
 'Readiness still reports nine unresolved high or critical incidents. One business owner is supported; actual staff review responsibilities remain to be confirmed. Sandbox payment configuration is not live-provider acceptance.',
 'admin-readiness','Launch Readiness exposes the existing NO-GO decision and individual outstanding gates.')

topic('Resolve common problems','All users','The affected order booking or account',
 'Keep the original reference and identify the failed stage. This avoids duplicate charges, duplicate orders and misleading completion records.',
 ['Record not found: clear page filters, check the reference, account and branch. A permission error needs an access review, not a shared password.',
 'Payment pending: retain the original provider reference, check verification and contact finance. Invoice issued does not mean paid; cash recorded does not mean independently verified.',
 'Order cannot progress: read the exact guard. Check address coverage, eligible stock, inspection, valid qualifications, calibration, custody, proof and payment as applicable.',
 'Service work blocked: confirm the latest quotation, customer approval, independent review, payment and work authorisation. Do not continue with an obsolete quote.'],
 'The responsible person resolves the underlying condition and the authoritative record allows the next step. Refresh once after success and check the result.',
 'For a suspected leak, unsafe appliance or immediate danger, follow qualified emergency procedures and local emergency guidance. Do not use a support chat or an application workaround as a substitute for urgent safety action.',
 sub='Support evidence should include the order or booking reference, time, role, exact message and a redacted screenshot. Exclude passwords, private links, handover codes, card details and unrelated customer information.')

topic('Use the daily handover checklist','Admin and team leads','Start and end of each operational day',
 'Use this practical handover to keep customer promises, physical custody and financial records aligned. Assign each task to a real authorised person.',
 ['Start of day: review new orders and service requests, stock eligibility, vehicle readiness, current qualifications and meter calibration. Resolve blocking issues before dispatch.',
 'During operations: monitor unassigned work, acknowledgement, inspection, custody, arrival, exceptions and customer messages. Obtain revised approvals before added work.',
 'End of day: reconcile actual gas and product returns, verify cash independently, resolve pending provider payments, review open service reports and close eligible trips.',
 'Owner review: check approval queues, incident ownership, low stock, policy versions and launch gates. Keep restricted approvals pending until eligible independent review is possible.'],
 'Every open obligation has a reference, responsible person and next step. Historical records remain intact.',
 'Do not use numerical dashboard totals alone as a handover. Unknown ETA, unavailable profit, empty histories and expired evidence each require their own interpretation.',
 sub='Terms: purchase credit is spendable wallet value; rewards points are programme records. Custody is responsibility for issued physical stock. A quotation proposes scope and price; an invoice requests payment; a verified receipt records money received. Approval authorises a change; activation or execution applies it.')

def configure(doc):
    sec=doc.sections[0]; sec.page_width=Inches(8.5);sec.page_height=Inches(11)
    sec.top_margin=Inches(.65);sec.bottom_margin=Inches(.65);sec.left_margin=Inches(.75);sec.right_margin=Inches(.75)
    sec.footer_distance=Inches(.28)
    styles=doc.styles
    for name in ['Normal','Title','Subtitle','Heading 1','Heading 2','Heading 3','Caption']:
        styles[name].font.name='Arial';styles[name].font.color.rgb=RGBColor(0,0,0)
    styles['Normal'].font.size=Pt(11);styles['Normal'].paragraph_format.line_spacing=1.08
    styles['Normal'].paragraph_format.space_after=Pt(7)
    styles['Title'].font.size=Pt(34);styles['Title'].font.bold=True
    styles['Heading 1'].font.size=Pt(23);styles['Heading 1'].font.bold=True
    styles['Heading 1'].paragraph_format.space_after=Pt(9)
    styles['Heading 2'].font.size=Pt(12);styles['Heading 2'].font.bold=True
    styles['Heading 2'].paragraph_format.space_before=Pt(9);styles['Heading 2'].paragraph_format.space_after=Pt(4)
    styles['Caption'].font.size=Pt(9);styles['Caption'].font.italic=False;styles['Caption'].font.bold=False
    for node in doc.styles.element.xpath('.//w:pBdr'):
        node.getparent().remove(node)
    footer=sec.footer.paragraphs[0];footer.alignment=WD_ALIGN_PARAGRAPH.RIGHT
    r=footer.add_run('EasyGas user manual   |   20 November 2026   |   ');r.font.size=Pt(8)
    fld=OxmlElement('w:fldSimple');fld.set(qn('w:instr'),'PAGE');footer._p.append(fld)
    doc.core_properties.title='EasyGas website user manual';doc.core_properties.subject='Role based operating guide for the EasyGas client demo';doc.core_properties.author='EasyGas project documentation'

def p(doc,text,boldlead=None):
    para=doc.add_paragraph()
    if boldlead:para.add_run(boldlead).bold=True
    para.add_run(text)
    return para

def figure(doc,name,caption,index,cover=False):
    original=BASE/'screenshots'/name
    im=Image.open(original)
    # Focus actual UI regions without adding, removing or altering product state.
    # The order dialog has a tighter crop so its tab labels remain readable.
    if name=='admin-order-detail.jpg':box=(320,285,1090,670)
    elif cover:box=(0,0,im.width,min(im.height,760))
    elif name=='sign-in.jpg':box=(280,220,im.width-25,min(im.height,850))
    elif name=='driver-trip.jpg':box=(315,30,940,665)
    elif name=='admin-approvals.jpg':box=(285,465,1390,765)
    elif name.startswith('public-') or name=='customer-gas-order.jpg':box=(0,90,im.width,850)
    else:box=(245,100,im.width,860)
    box=(box[0],box[1],min(box[2],im.width),min(box[3],im.height))
    im=im.crop(box)
    path=BUILD/(original.stem+'-crop.png');im.save(path)
    maxw=6.95;maxh=2.9 if not cover else 3.5
    scale=min(maxw/im.width,maxh/im.height)
    para=doc.add_paragraph();para.alignment=WD_ALIGN_PARAGRAPH.CENTER
    run=para.add_run();run.add_picture(str(path),width=Inches(im.width*scale),height=Inches(im.height*scale))
    para.paragraph_format.space_after=Pt(4);para.paragraph_format.keep_with_next=True
    c=doc.add_paragraph(f'Figure {index}. {caption}','Caption');c.paragraph_format.space_after=Pt(9)
    return {'figure':index,'source':'screenshots/'+name,'crop':list(box),'caption':caption}

def make():
    doc=Document();configure(doc);figs=[]
    doc.add_paragraph('EasyGas website user manual','Title')
    doc.add_paragraph('Customer and staff operating guide','Subtitle')
    p(doc,'Use this guide to shop, manage orders, coordinate delivery, complete service work and administer the EasyGas website. It is customised for one Admin/business owner and separately authorised operational staff.')
    figs.append(figure(doc,'public-home.jpg','The current EasyGas client demo home page.',1,True))
    p(doc,'Edition 2 • 20 November 2026 • Client demo web application')
    p(doc,'Website: https://easygas-client-demo.vercel.app')
    p(doc,'Screenshots show synthetic demo records captured on 20 November in Australia/Brisbane, corresponding to 19 November 2026 in Lagos. Operational dates and windows in the product use Africa/Lagos.')
    p(doc,'Commercial production remains NO-GO. Nine approved demo-only notices are published. The authorised synthetic QA renewal expires at 18:31 UTC on 19 November 2026. This guide explains the software; it does not approve commercial terms or provide physical LPG training.')
    doc.add_page_break()
    doc.add_heading('Find the task you need',1)
    p(doc,'Start with your role, then turn to the task page. Each page identifies who can use it, where to go, the steps, the expected result and how to handle a block.')
    for i,t in enumerate(topics,1):
        para=doc.add_paragraph();para.paragraph_format.space_after=Pt(1)
        para.paragraph_format.line_spacing=Pt(13)
        para.paragraph_format.tab_stops.add_tab_stop(Inches(6.95),WD_TAB_ALIGNMENT.RIGHT,WD_TAB_LEADER.DOTS)
        link=OxmlElement('w:hyperlink');link.set(qn('w:anchor'),f'task{i:02d}')
        run=OxmlElement('w:r');props=OxmlElement('w:rPr')
        size=OxmlElement('w:sz');size.set(qn('w:val'),'21');props.append(size)
        run.append(props);txt=OxmlElement('w:t');txt.text=f'{i:02d}   {t["title"]}';run.append(txt);link.append(run);para._p.append(link)
        para.add_run(f'\t{i+2}').font.size=Pt(10.5)
    p(doc,'Customers: pages 3–13. Business and field operations: pages 14–28. Governance, exceptions and daily handover: pages 29–33.')
    p(doc,'The separate website audit report lists route coverage, reproduced defects, operational blockers and acceptance limits. Empty and guarded states are kept visible in that report.')
    for i,t in enumerate(topics,1):
        doc.add_page_break();head=doc.add_heading(f'{i:02d} {t["title"]}',1)
        start=OxmlElement('w:bookmarkStart');start.set(qn('w:id'),str(i));start.set(qn('w:name'),f'task{i:02d}')
        end=OxmlElement('w:bookmarkEnd');end.set(qn('w:id'),str(i));head._p.insert(0,start);head._p.append(end)
        para=doc.add_paragraph();para.paragraph_format.space_after=Pt(8)
        r=para.add_run(t['who']+'  |  '+t['where']);r.font.size=Pt(9);r.bold=True
        p(doc,t['intro'])
        if t['shot']:
            figs.append(figure(doc,t['shot']+'.jpg',t['caption'],len(figs)+1))
        for n,text in enumerate(t['steps'],1):
            para=p(doc,text,f'{n}. ');para.paragraph_format.space_after=Pt(5)
        p(doc,t['check'],'Check the result. ')
        p(doc,t['blocked'],'If blocked. ')
        if t['sub']:p(doc,t['sub'])
    for node in doc.element.xpath('.//w:pBdr'):node.getparent().remove(node)
    doc.save(OUT/'EasyGas-User-Manual.docx')
    (BASE/'manual-content.json').write_text(json.dumps({'edition':'2026-11-20-edition-2','topics':topics,'figures':figs,'plannedPages':len(topics)+2},indent=2)+'\n')
    print(json.dumps({'topics':len(topics),'figures':len(figs),'plannedPages':len(topics)+2,'docx':str(OUT/'EasyGas-User-Manual.docx')}))

if __name__=='__main__':make()
