# Implementation

The admin bell opens a compact modal tray. At narrow widths it opens from the bottom and scrolls internally. The customer, owner, driver and technician screens reuse the native inbox with each workspace retaining its existing entry point and destination handling. The driver badge reads the server unread total.

All and Unread filters use authoritative counts. Web supports page selection and mark all. Native supports single and all-unread actions. The existing notification producers and rows are retained. Approval and System filters and approval-specific deep links need typed producer metadata and verified destination eligibility.

Web and native TypeScript checks and the web build passed. Chromium exercised desktop and 390px layouts with synthetic accounts. Native Simulator and physical-device verification remain open.
