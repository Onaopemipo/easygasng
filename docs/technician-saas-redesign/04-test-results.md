# Executed validation — 19 November 2026

Decision: **PARTIAL / NO-GO** for the complete cross-platform brief. No hosted deployment or commercial launch occurred. All 90 scenarios and 40 gates remain in the denominators; `scenarios.csv` distinguishes PASS, PARTIAL, BLOCKED and NOT_RUN. Passing automated regression does not prove physical work, mobile offline operation or delivery by external providers.

## Automated checks

| Check | Actual result | Evidence |
| --- | --- | --- |
| Baseline focused | 19 passed, 0 failed, 0 skipped | `evidence/baseline-tests.txt` |
| Focused technician/service/field/schedule | 23 passed, 0 failed, 0 skipped | `evidence/focused-final.txt` |
| Overview/config focused | 4 passed | `evidence/overview-config.txt` |
| Full repository with disposable PostgreSQL enabled | 760 passed, 0 failed, 0 skipped | `evidence/regression-postgres.txt` |
| Reviewed source preservation after final native copy change | 2 passed, 0 failed | `evidence/preservation-final.txt` |
| Native dependency assertions | 3 passed | `evidence/native-dependency-tests.txt` |
| Web and native TypeScript | passed | `evidence/web-types.txt`, `evidence/native-types.txt` |
| Web production build | passed | `evidence/web-build.txt` |
| Native iOS/Android JS export | passed before the final copy-only change | `evidence/native-export.txt` |
| Final iOS simulator Release, local ad-hoc signature | BUILD SUCCEEDED; signature verification exit 0; installed | `evidence/ios-build-final.txt`, `evidence/ios-signature-check.txt`, `evidence/ios-install.txt` |
| Final Android Release APK | BUILD SUCCESSFUL; streamed installation Success | `evidence/android-build-final.txt`, `evidence/android-install.txt` |
| Web/native dependency audits | 0 vulnerabilities each | `evidence/web-audit.txt`, `evidence/native-audit.txt` |

The PostgreSQL run used a temporary local cluster on port55479 with per-test schemas and was stopped afterwards. Its 760-test pass predates the final native footer/decorative accessibility edit; subsequent native TypeScript, both rebuilt binaries and exact preservation checks passed. The focused23 cover canonical record data and guards, not all90 interactive scenarios. No test counts are added together as a fabricated total of distinct cases.

Historical failed attempts are retained: first broad run729/759 passed,2 preservation mismatches and28 skipped (`evidence/regression.txt`); exact reviewed technician source mapping corrected the continuation checks, then the fresh PostgreSQL run passed760/760. Initial nested iOS plugin resolution failed before its path repair. Initial concurrent web typecheck saw generated Next types removed by the build; sequential web types passed. A later native typecheck command used an unsupported root workspace selector; rerunning from `apps/mobile` passed. Android Studio's old driver project sync shows an earlier unrelated path-with-spaces build error; the current root Release APK build passed. None of those failed runs is counted as successful evidence.

## Actual desktop and mobile web session

Used the existing authenticated route and an isolated synthetic PGlite fixture on localhost3104. No hosted/original local business database was changed. Primary technician had23 assigned future jobs,1 active assessment and1 cancelled history record. A second technician had no assignments. This is explicit QA data, never production examples.

- Home showed actual23/1/0/23 counts, Africa/Lagos date, assigned next appointment and scheduled-day denominator0/1. Availability and connection/eligibility explanations were distinct.
- Jobs paginated20+4; search returned the active reference; Upcoming returned23. Dedicated detail/deep link and refresh retained canonical job identity. Existing unpaid-work submission was rejected by the server and the entered reason remained.
- Acknowledged EGS-F8458A08 through the actual versioned assignment form. Uploaded a consented, clearly labelled synthetic QA placard through the private multipart evidence form. This is an upload test, not evidence of a physical service or safety certification.
- Cancelled EGS-08E9EAF7 appeared in terminal History; active jobs were excluded. Positive completed-report viewing in the redesigned history remains unrun.
- Profile showed actual identity, branch and independently verified read-only qualification. Light/Dark/System worked; no financial, earnings, vehicle or administrative controls appeared.
- Empty technician showed confirmed zeros/no next appointment. Opening the other technician's detail link rendered an inaccessible state with no customer/detail form.
- Paused the owned QA backend for20 seconds. Timeout/stale state disabled all job controls; a typed unsubmitted assessment draft survived failure and refresh/recovery.
- Availability off during an active visit was rejected by the canonical reconciliation guard and stayed available.
- DOM-backed content-bound checks at320,375,390,430,768,1024,1280,1440,1920px showed zero horizontal overflow, including320px detail. Browser viewport override was reset. See `evidence/web-content-bounds.json` and `evidence/web-fit.json`.

Screenshots: `web-home-1440.jpg`, `web-home-768.jpg`, `web-home-390.jpg`, `web-profile-dark.jpg`, `web-history.jpg`, `web-unpaid-work-blocked.jpg`, `web-empty.jpg`, `web-cross-technician-denied.jpg`, `web-stale-draft.jpg`, `web-availability-guard.jpg`, `web-assignment-acknowledged.jpg`, `web-private-evidence-upload.jpg`, `web-detail-320.jpg` under evidence.

## Installed native checks

User requested direct installation after Device Hub's picker failed. Installed the dedicated iOS technician local app on **EasyGas First Sign-In QA, iPhone15 simulator, iOS26.5**, UDID `1DEB740D-CCB3-41CC-9992-CFCB859CD985`, bundle `com.easygasng.technician.local`. Signed in through the actual app to the same isolated backend. Home showed23/1/0/23, next assessment and0/1 progress. Jobs listed24 active jobs with search/filter/pagination. Search opened EGS-13FE8981; existing Job Details showed payment/scope explanation, timeline and contextual workflow sections. Back returned to Jobs. History showed only the cancelled record. Profile showed identity/branch; Skills & Services stated that operations independently verifies qualifications and provided no self-grant action. Dark and System selection were observed. Final reinstall retained sign-in, relaunched successfully, and Jobs showed the corrected current-branch footer. Final artifact hashes are in `evidence/native-build-artifacts.json`.

Actual screenshots: `ios-home.png`, `ios-jobs.png`, `ios-job-detail.png`, `ios-history.png`, `ios-profile.png`, `ios-jobs-final.png`. `ios-final-jobs-ax.txt` records final corrected footer. Screenshot toolbar produced actual simulator PNGs; no generated mockups are used as acceptance evidence.

Android Release APK installed on **emulator-5554 / EasyGas Driver QA API37.1** (`com.easygasng.customer.local`, existing shared role shell). Android Studio's embedded emulator remained on the pre-existing driver app; Home/shortcuts/Return had no visible effect and a coordinate fallback reported no accessible window. Thus Android technician launch/sign-in/four-screen/theme/Back acceptance is **BLOCKED**, not PASS. See `evidence/android-control-blocker.txt`. No Android technician screenshot is claimed.

## Outstanding acceptance

Real-phone locked-screen, airplane-mode, restart/reconnect, queued evidence, camera/library permission outcomes and technician cache/revocation handling through installed UI remain unrun. VoiceOver/TalkBack and increased text-scale coverage remain unrun; the iOS AX tree still exposes a decorative filter glyph despite its accessible=false prop, so full accessibility is not certified. Full keyboard/reduced-motion acceptance and positive completed-report/history evidence viewing remain unrun. Simulator safe-area observations do not certify all devices.

Commercial production remains NO-GO. Earlier driver order EG-2026-7BB8640B recovery remains independent and incomplete; its approved one-hour demo bulk qualification renewal has not been applied by this UI phase. Existing demo fulfilment/sandbox configuration and the Excel import hold were preserved.

Matrix validation: `node --import tsx --test --test-reporter=spec tests/customer-traceability.test.ts` passed2/2 with0 failures/skips (`evidence/traceability.txt`). Final scenario coverage:58 PASS,26 PARTIAL,1 BLOCKED,5 NOT_RUN out of90; requirements5/12 verified and gates26/40. Blocked/unrun rows remain in scope.
