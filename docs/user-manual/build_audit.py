"""Render the evidence-based audit as a standalone searchable PDF."""
from pathlib import Path
import json, html
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import Paragraph, Table, TableStyle, Image, Frame
from reportlab.lib.enums import TA_LEFT

ROOT=Path(__file__).resolve().parents[2];BASE=ROOT/'docs/user-manual';E=BASE/'evidence'
OUT=ROOT/'output/pdf';OUT.mkdir(exist_ok=True)
inv=json.loads((E/'route-inventory.json').read_text());views=json.loads((E/'browser-audit.json').read_text())
checks=json.loads((E/'role-boundaries.json').read_text())
policies=['/privacy','/terms','/refund','/cancellation','/service-terms','/warranty','/credit-terms','/loyalty-terms']
tokens=['/activate','/payment-request','/payment-return','/reset-password','/verify-email','/accept-invitation']
findings=[
 dict(id='WEB-A01',title='Eight customer policies await publication',priority='High',kind='Business publication gap',status='OPEN',owner='Admin and approved policy reviewer',
      observed='All eight public policy pages show Policy awaiting business publication. The policy directory renders, but it does not supply the missing approved documents. The cookie settings link points to the unpublished privacy page.',
      reproduce='Open Privacy, Terms, Refund, Cancellation, Service terms, Warranty, Credit terms and Loyalty terms from the website or policy directory.',
      impact='Customers cannot read the approved current terms and privacy information through those links. This is a launch and customer-information gap, not a server crash.',
      action='Prepare and review the business-approved versions in Customer Policies, complete the required approval and publication steps, then re-open every public link. Verify title, version, effective date, content and consent-linked references.',
      acceptance='All eight links display their approved current documents and correct versions, with policy publication and customer consent handling tested. Do not count a draft or directory link as publication.',
      evidence=['view-public-_privacy.txt','view-public-_terms.txt','view-public-_refund.txt','view-public-_cancellation.txt','view-public-_service-terms.txt','view-public-_warranty.txt','view-public-_credit-terms.txt','view-public-_loyalty-terms.txt','view-owner-_admin_policies.txt']),
 dict(id='WEB-A02',title='Technician support shortcut reaches a denied page',priority='Medium',kind='Reproduced product defect',status='OPEN',owner='Web implementation owner',
      observed='Technician Home offers Contact support. It opens /support, whose customer conversation read returns Your account does not have permission for this action.',
      reproduce='Sign in as the existing Technician, open Home and follow Contact support. The customer support heading renders, followed by the permission error.',
      impact='A technician seeking help reaches a dead end from a first-class workspace action. The endpoint denial itself is an access control working as intended.',
      action='Point the shortcut to an appropriate staff help or dispatch destination, or implement narrowly scoped staff support. Preserve customer and branch isolation; do not grant technicians broad customer-support access.',
      acceptance='The Technician support action reaches useful help with no permission error, and customer/driver/finance negative access checks continue to deny unrelated workspaces.',
      evidence=['view-technician-_support.txt','view-technician-_admin_bookings.txt'],source='apps/web/components/technician-workspace.tsx',shot='audit-technician-support.jpg'),
 dict(id='WEB-A03',title='Email verification error refers to a reset link',priority='Low',kind='Reproduced copy defect',status='OPEN',owner='Web implementation owner',
      observed='The missing-token /verify-email page is titled Confirm your email address but its warning says If your reset link has expired, request a new one.',
      reproduce='Open /verify-email without a token. Compare the verification heading with the reset-link wording.',
      impact='The recovery instruction describes the wrong task and can send a customer to password reset while attempting email verification.',
      action='Use verification-specific missing or expired link guidance, including the correct resend route. Keep reset and invitation messages scoped to their own flow.',
      acceptance='Missing and expired verification links show correct instructions; valid-token verification and reuse rejection are tested separately.',
      evidence=['view-public-_verify-email.txt','view-public-_reset-password.txt']),
 dict(id='WEB-A04',title='Sandbox meter calibration is expired',priority='High',kind='Operational prerequisite',status='BLOCKED',owner='Authorised qualified operations reviewer',
      observed='A normal inventory bulk summary read at 15:25:59 UTC on 19 November shows the active sandbox meter calibration expired at 11:53:44 UTC that day. Active does not mean currently calibrated.',
      reproduce='Review the authorised bulk gas equipment summary and compare calibration expiry with current time. No loading, dispensing or renewal was attempted.',
      impact='The current sandbox is not ready for another gas journey requiring valid calibration. Correct safety rejection must not be treated as a software defect to bypass.',
      action='Before another authorised synthetic journey, obtain appropriate current demo-only review and evidence for the meter and required staff qualifications. Real operation needs genuine qualified evidence, not QA placeholders.',
      acceptance='Current authorised evidence covers the entire intended journey and expired-evidence negative checks still fail. The earlier two-hour renewal grants no continuing authority.',
      evidence=['safety-readback.json']),
 dict(id='WEB-A05',title='Commercial launch readiness remains NO GO',priority='Critical',kind='Existing release decision',status='BLOCKED',owner='Admin and release gate owners',
      observed='Launch Readiness states Production readiness · NO-GO. The captured page reports nine unresolved high or critical incidents and incomplete external health/error alerting and on-call ownership, alongside other unverified gates.',
      reproduce='Open Launch Readiness as Admin and inspect each gate and its current evidence. Compare with Operational Incidents rather than using demo uptime as readiness proof.',
      impact='This documentation audit cannot authorise commercial operation. Existing provider, native/device, physical, data-import and retention decisions remain separate.',
      action='Assign owners and evidence to every current gate, resolve incidents and complete the established release acceptance process. Preserve the actual-import hold and retain-all decisions.',
      acceptance='Every required production gate has executed accepted evidence and the authorised release decision changes through the governed process. No gate is waived here.',
      evidence=['view-owner-_admin_readiness.txt','view-owner-_admin_incidents.txt'],shot='admin-readiness.jpg'),
 dict(id='WEB-A06',title='Restricted approvals need a workable staffing arrangement',priority='Medium',kind='Operating model review',status='OPEN',owner='Sole Admin and eligible finance staff',
      observed='The scoped sole-owner EasyRewards policy request shows Awaiting owner approval · 0/1. Restricted financial, access, payment and safety requests retain independent review requirements.',
      reproduce='Review the named EasyRewards request and compare its eligibility with the type-specific approval controls. Requested by identifies the author, not an accepted decision.',
      impact='One business owner is compatible with the scoped owner path. It does not by itself establish enough eligible independent reviewers for every restricted transaction.',
      action='Document real maker, reviewer and executor responsibilities for the small company. Confirm how each restricted request can be processed by authorised staff without fake owners or shared identities.',
      acceptance='A real authorised operating arrangement covers each restricted action while requester exclusion, identity, revision and expiry checks remain enforced.',
      evidence=['view-owner-_admin_approvals.txt','role-access.json']),
 dict(id='WEB-A07',title='Financial and location summaries have deliberate unknown states',priority='Information',kind='Reporting and telemetry limit',status='OPEN',owner='Finance and operations data owners',
      observed='Net profit or inventory value can show Unavailable where cost evidence is incomplete. Dispatch can show unknown GPS or unavailable ETA. The driver web trip form says it does not record GPS.',
      reproduce='Review the dashboard, financial summary, dispatch map and driver Manage trip text. Do not infer missing values from availability switches.',
      impact='A user can misread missing evidence as zero profit, zero value or live tracking. No calculation or tracking defect was established by those states.',
      action='Maintain clear unknown-state copy and train users to supply authoritative cost, stock and telemetry evidence. Complete native/device acceptance separately when needed.',
      acceptance='Reports reconcile to accepted inputs and tracking claims match verified telemetry capability; unknown values are never silently replaced with zero or a guessed ETA.',
      evidence=['view-owner-_admin.txt','view-owner-_admin_finance.txt','view-manager-_admin_deliveries.txt','driver-trip.txt'])
]
(BASE/'findings.json').write_text(json.dumps(findings,indent=2)+'\n')

coverage=[]
for entry in inv:
    obs=[v for v in views if v['route'].split('?')[0]==entry['route']]
    if not obs:raise ValueError(entry)
    state='Observed read only'
    if entry['route'] in policies:state='Unpublished policy'
    elif entry['route'] in tokens:state='Missing context guard'
    elif entry['route'] in ['/cart','/checkout','/combined-checkout']:state='Empty or signed out guard'
    coverage.append({**entry,'observedRoles':sorted(set(v['role'] for v in obs)),'classification':state,'evidence':[v['snapshotFile'] for v in obs]})
(E/'route-coverage.json').write_text(json.dumps(coverage,indent=2)+'\n')

styles=getSampleStyleSheet()
for k in ['Normal','Title','Heading1','Heading2','Heading3']:
    styles[k].textColor=colors.black;styles[k].fontName='Helvetica'
styles['Normal'].fontSize=11;styles['Normal'].leading=15;styles['Normal'].spaceAfter=8
styles['Title'].fontSize=30;styles['Title'].leading=35;styles['Title'].spaceAfter=18
styles['Heading1'].fontSize=22;styles['Heading1'].leading=27;styles['Heading1'].spaceAfter=13
styles['Heading2'].fontSize=13;styles['Heading2'].leading=17;styles['Heading2'].spaceBefore=9;styles['Heading2'].spaceAfter=6
styles.add(ParagraphStyle(name='Small',fontName='Helvetica',fontSize=9,leading=12,spaceAfter=6))
styles.add(ParagraphStyle(name='Cell',fontName='Helvetica',fontSize=9.5,leading=12))
P=lambda text,style='Normal':Paragraph(html.escape(text).replace('\n','<br/>'),styles[style])
def table(rows,widths):
    data=[[P(str(c),'Cell') for c in row] for row in rows]
    t=Table(data,colWidths=widths,repeatRows=1,hAlign='LEFT')
    t.spaceAfter=9
    t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#EEEEEE')),('GRID',(0,0),(-1,-1),.5,colors.HexColor('#D9D9D9')),('VALIGN',(0,0),(-1,-1),'MIDDLE'),('LEFTPADDING',(0,0),(-1,-1),8),('RIGHTPADDING',(0,0),(-1,-1),8),('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7)]))
    if len(rows)>20:
        t.setStyle(TableStyle([('TOPPADDING',(0,0),(-1,-1),6),('BOTTOMPADDING',(0,0),(-1,-1),6)]))
    return t

pages=[]
def page(title,items):pages.append([P(title,'Heading1')]+items)
def finding(f,compact=False):
    out=[P(f['id']+'  '+f['title'],'Heading2'),P(f["priority"]+' | '+f['kind']+' | '+f['status']+' | Owner: '+f['owner'],'Small')]
    for label,key in [('Observed','observed'),('Reproduce','reproduce'),('Effect','impact'),('Recommended action','action'),('Acceptance','acceptance')]:
        out.append(P(label+'. '+f[key]))
    out.append(P('Evidence: '+', '.join(f['evidence']),'Small'))
    return out

page('EasyGas website audit',[
 P('Read only review and operating manual evidence','Heading2'),
 P('20 November 2026 | Client demo web application'),
 P('The public website, customer account and business workspaces were inspected across all 86 inventoried route surfaces. Seven findings distinguish two reproduced product defects from publication gaps, operational prerequisites and existing release limitations. Commercial production remains NO-GO.'),
 table([['Measure','Executed result'],['Route coverage','86 of 86 inspected; none excluded'],['Role perspectives','Customer, Admin, Service Manager, Inventory, Driver and Technician; public access also inspected'],['Browser observations',f'{len(views)} recorded role and route observations, plus driver and technician subviews'],['Access checks','15 of 15 expected HTTP results; includes 9 negative controls'],['Business preservation','13 original orders and ledger, stock, gas, wallet and policy readbacks unchanged'],['Deliverables','33 page manual with 25 genuine screenshots; editable Word and PDF, plus this audit']], [125,379]),
 P('Scope and meaning','Heading2'),
 P('Inspected means the route was opened and its actual rendered, guarded, unpublished or empty state was recorded. It does not mean every transaction, token, write action or physical workflow was fully accepted.'),
 P('No business mutation, policy activation, qualification renewal, payment, order, stock movement or deployment was performed. Normal account sign-in and read requests used existing labelled QA accounts.'),
 P('Website: https://easygas-client-demo.vercel.app','Small'),
 P('Application baseline: 35ed307b0e38477ad1d70adacd87a0f02f4949a5, Ready deployment dpl_7rBejjBZL91bqowRZBUAQsekjAJL. See deployment identity evidence. Audit observations use UTC timestamps; screenshots were captured on 20 November Brisbane / 19 November Lagos.','Small')])
page('Publish the customer information',finding(findings[0])+[
 P('Pages retained in the denominator','Heading2'),
 table([['Customer document','Route'],['Privacy','/privacy'],['Terms','/terms'],['Refund','/refund'],['Cancellation','/cancellation'],['Service terms','/service-terms'],['Warranty','/warranty'],['Credit terms','/credit-terms'],['Loyalty terms','/loyalty-terms']],[170,334]),
 P('The audit identifies missing publication; it does not write, approve or provide legal advice on the policy content. Existing analytics receiver verification does not resolve publication of the linked public privacy document.','Small')])
support=BASE/'screenshots/audit-technician-support.jpg'
im=Image(str(support),width=504,height=504*712/1265)
page('Repair the technician help route',finding(findings[1])+[im,P('Actual Technician /support view. The permission error is reproduced; no access policy was weakened.','Small')])
page('Correct verification guidance',finding(findings[2])+[
 P('Guarded entry points were also inspected','Heading2'),
 table([['Entry','Observed condition'],['/activate','Phone verification and order review disabled without the required context'],['/payment-request','Open the complete request link from your message'],['/payment-return','Open the original payment return link'],['/reset-password','Missing or expired link guidance'],['/accept-invitation','Invitation-specific missing link guidance']],[150,354]),
 P('A missing-context guard is expected protection. Valid invitation, reset, activation and payment token consumption was not exercised in this read-only audit.','Small')])
page('Restore operational prerequisites',finding(findings[3])+[
 P('Safety evidence inspected','Heading2'),
 table([['Field','Observed value'],['Meter','SANDBOX QA VEHICLE E8ED8AE8'],['Active','True'],['Calibration expiry UTC','19 November 2026 at 11:53:44.767'],['Read timestamp UTC','19 November 2026 at 15:25:59.147'],['Renewal during this audit','None']],[165,339]),
 P('The current meter expiry was read directly. The entire live qualification register and a fresh dispensing attempt were not retested. A valid meter alone would not establish that every other fulfilment prerequisite is satisfied.','Small')])
page('Preserve the release decision',finding(findings[4])+[
 P('Existing acceptance limits','Heading2'),
 P('The current readiness screen includes unverified release scope, build and CI evidence, native distribution, managed database and TLS, production origin, business authority, physical inventory, qualified service operation, cash reconciliation, authentication, concurrency, restore, workers and retention fulfilment.'),
 P('This audit records the current readiness decision. It does not erase historical bounded CI, synthetic delivery or analytics successes, and it does not turn their success into full production acceptance.')])
page('Match controls to the small company',finding(findings[5])+[
 P('Read unknown states correctly','Heading2'),
 P(findings[6]['observed']),P(findings[6]['impact']),P('Recommendation. '+findings[6]['action']),
 P('WEB-A07 | Information | Reporting and telemetry limit | OPEN. Evidence: '+', '.join(findings[6]['evidence']),'Small')])
page('Review access and data preservation',[
 P('All 15 normal HTTP checks returned the expected status. These are selected role-boundary probes, not an exhaustive penetration test or full action-permission matrix.'),
 table([['Account role','Read action','Expected and actual']]+[[{'owner':'Admin','manager':'Service Manager','finance':'Inventory'}.get(c['role'],c['role'].capitalize()),c['action'],str(c['status'])] for c in checks['checks']],[130,260,114]),
 P('401 means no authenticated session; 403 means the signed-in role is not allowed. Six positive reads returned 200. Driver and Technician workspaces remain restricted.'),
 P('UM-PRESERVATION compared normal product readbacks after the final browser work with the pre-audit baseline. All 13 orders, finance ledger, inventory, gas, customer wallet and current loyalty policy were unchanged. No hosted database connection or direct database query was used.'),
 P('Evidence: role-boundaries.json, role-access.json, business-before.json and business-after.json. Credentials and full private baseline copies are excluded from deliverables.','Small')])

for start in range(0,len(coverage),22):
    part=coverage[start:start+22]
    items=[P(f'Entries {start+1} to {min(start+22,len(coverage))} of 86. Classification records what was actually observed; every row remains in scope.','Small')]
    rows=[['Route','Observed role','Classification']]
    for row in part:
        roles=[{'owner':'Admin','manager':'Manager','finance':'Inventory'}.get(r,r.capitalize()) for r in row['observedRoles']]
        rows.append([row['route'],', '.join(roles),row['classification']])
    items.append(table(rows,[225,120,159]))
    items.append(P('Exact screenshots, headings, alerts and timestamps: browser-audit.json and the referenced view snapshots. Full route mapping: route-coverage.json. Driver and Technician Home, Jobs or Orders, History and Profile subviews were additionally inspected.','Small'))
    page('Route coverage '+str(start//22+1),items)

page('Acceptance boundaries and next actions',[
 P('What this audit establishes','Heading2'),
 P('All 86 current inventoried website surfaces were opened. Thirty Admin routes and customer shopping, account and service areas were inspected; additional Service Manager, Inventory, Driver and Technician views checked role-specific behaviour. Selected protected reads denied unauthorised roles. The illustrated manual uses genuine captures and current control names.'),
 P('What remains untested','Heading2'),
 P('New financial transactions, refunds, approvals, invitation consumption, password changes, stock writes, service completion and physical fulfilment were not submitted. Installed native apps, device permissions, live providers, background GPS, offline recovery, formal accessibility, load testing and complete cross-browser coverage were not certified.'),
 P('Responsive checks were representative: 390 by 844 sign-in and Admin approvals only. The desktop audit used the available browser viewport, primarily 1440 by 960. This is not a complete mobile acceptance pass.'),
 P('Recommended order of work','Heading2'),
 P('1. Assign business owners to the eight unpublished policies and production gate evidence. Confirm the real maker/reviewer operating model for restricted actions.'),
 P('2. Repair the Technician support shortcut and email-verification copy. Verify the help destination with the Technician role and retain negative access tests.'),
 P('3. Before another authorised synthetic fulfilment test, arrange current authorised safety evidence and retest expiry rejection. Do not silently extend earlier time-bound approvals.'),
 P('4. Re-run affected acceptance cases, update the stable requirement IDs and evidence in the traceability matrix, then request any separately required deployment or commercial release decision.'),
 P('Prior successful evidence','Heading2'),
 P('The 19 November role-based order-to-delivery pass records ten bounded synthetic cases and four fixes. The named fresh delivery and GA4 receiver checks are historical supporting evidence. This audit does not claim to repeat those transactions. References: docs/reports/role-order-delivery-acceptance-20261119.md and docs/analytics/REALTIME-VERIFICATION.md.','Small')])

def build():
    dest=OUT/'EasyGas-Website-Audit.pdf';c=canvas.Canvas(str(dest),pagesize=letter)
    c.setTitle('EasyGas website audit');c.setAuthor('EasyGas project documentation')
    for idx,items in enumerate(pages,1):
        c.bookmarkPage('page'+str(idx));c.addOutlineEntry(re.sub('<[^>]+>','',items[0].text),'page'+str(idx),level=0)
        frame=Frame(54,47,504,698,leftPadding=0,rightPadding=0,topPadding=0,bottomPadding=0)
        remaining=list(items);frame.addFromList(remaining,c)
        if remaining:raise ValueError(f'Audit page {idx} overflows by {len(remaining)} elements')
        c.setFont('Helvetica',8);c.drawRightString(558,25,f'EasyGas website audit | 20 November 2026 | {idx} of {len(pages)}');c.showPage()
    c.save();print(json.dumps({'auditPages':len(pages),'findings':len(findings),'routes':len(coverage),'path':str(dest)}))

import re
if __name__=='__main__':build()
