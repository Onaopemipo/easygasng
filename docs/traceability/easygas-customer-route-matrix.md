# Customer route traceability

All routes use the existing catch-all page and Site entry; signed-in customers share CustomerWorkspace. Public services/help stay accessible to guests. Driver and technician administration/native navigation is unchanged.

| Route | Label / Group | Page component | Data source | Authentication | Result |
|---|---|---|---|---|---|
| /account | Overview / overview | CustomerDashboard in apps/web/components | customer.dashboard widgets, wallet, schedules, refill.profiles | Server session required | VERIFIED_COMPLETE desktop + 390px |
| /notifications | Notifications / overview | NotificationInbox in apps/web/components | me, notifications.read | Server session required | VERIFIED_COMPLETE desktop + 390px |
| /account-settings | Account & Privacy / overview | AccountSettings in apps/web/components | account.profile, owned address/preferences/session actions | Server session required | VERIFIED_COMPLETE desktop + 390px |
| /services | Professional Services / gas | ProfessionalServices in apps/web/components | services.catalogue and authorised booking APIs | Public route; customer workspace shown when signed in | VERIFIED_COMPLETE desktop + 390px |
| /bookings | Service Appointments / gas | ProfessionalServices (bookings mode) in apps/web/components | bookings | Server session required | VERIFIED_COMPLETE desktop + 390px |
| /consumption | Cooking Gas Profiles / gas | RefillProfiles in apps/web/components | refill.profiles and owned feedback | Server session required | VERIFIED_COMPLETE desktop + 390px |
| /orders | My Orders / orders | Account in apps/web/components | orders | Server session required | VERIFIED_COMPLETE desktop + 390px |
| /wallet | My Wallet / orders | Account in apps/web/components | wallet | Server session required | VERIFIED_COMPLETE desktop + 390px |
| /purchase-credit | Credit & Redemption / orders | CreditWallet in apps/web/components | credits, rewards.program | Server session required | VERIFIED_COMPLETE desktop + 390px |
| /rewards | EasyRewards / plans | Account in apps/web/components | wallet | Server session required | VERIFIED_COMPLETE desktop + 390px |
| /schedules | Refill Plans / plans | Account in apps/web/components | schedules | Server session required | VERIFIED_COMPLETE desktop + 390px |
| /recurring | Recurring Orders / plans | RecurringOrders in apps/web/components | schedule.authorisations | Server session required | VERIFIED_COMPLETE desktop + 390px |
| /refill | Smart Refill / plans | Account + RefillProfiles in apps/web/components | refill.profiles | Server session required | VERIFIED_COMPLETE desktop + 390px |
| /help | Help & Support / support | ContentPage in apps/web/components | existing FAQs and support.create | Public route; customer workspace shown when signed in | VERIFIED_COMPLETE desktop + 390px |
| /support | Support Conversations / support | SupportDesk in apps/web/components | support.list and owned thread actions | Server session required | VERIFIED_COMPLETE desktop + 390px |

Full page/layout, ownership, loading, empty, error and evidence mappings are in [machine-readable route matrix](easygas-customer-routes.json). Browser results are in [route evidence](../testing/customer-dashboard-browser-20261030.json). Tablet remains a separate unverified requirement; successful rendering does not certify every business operation.
