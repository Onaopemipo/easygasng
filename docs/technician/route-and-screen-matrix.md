# Route and screen matrix
| Approved screen | Actual implementation | Acceptance |
|---|---|---|
| 1 Splash | technician/app.config.js native shell | Branding animation/waves pending; no blocking fake timer |
| 2 Sign In | TechnicianSignIn, technician.login | Existing work email/password and recovery, no identity duplication |
| 3 Home | TechnicianWorkspace | Actual counts, next job and availability; no sample figures |
| 4 My Jobs | TechnicianWorkspace | Assigned/in-progress/all search; latest 100 canonical records |
| 5 Job Details | TechnicianWorkspace | Current service/address/date/timeline and contact links |
| 6 Service In Progress | Services Appointment + work_phase | Server-authorised work, not a free-form status selector |
| 7 Checklist | Existing Appointment report form | Approved checks retained; dedicated approved visual layout pending |
| 8 Parts | Existing Appointment materials | Issued job quantities/use; no technician stock adjustment |
| 9 Proof | Existing BookingPhotos | Private camera/gallery and explicit consent added; encrypted offline and device acceptance pending |
| 10 Completed | Existing report/status | Customer-confirmed canonical completion; dedicated success screen pending |
| 11 History | TechnicianWorkspace | Authorised completed/failed/cancelled records |
| 12 Notifications | TechnicianWorkspace | Existing notifications with scoped job navigation |
| 13 Profile | TechnicianWorkspace | Real identity/qualifications/profile/security/preferences |

Tabs Home/Jobs/History/Profile. Deep links easygas-technician://jobs?bookingId=<UUID> reauthenticate and refetch canonical assigned bookings. Customer and driver experiences are preserved. Secondary checklist/material/proof destinations currently share the existing operational Appointment component, so route existence is not exact visual acceptance.
