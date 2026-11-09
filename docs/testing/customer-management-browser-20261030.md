# Customers screen browser verification — 30 October 2026

Isolated local QA dataset customer-dashboard-browser-qa-20261030-v2; synthetic owner and customer data only. Normal port 3003 untouched. QA port 3004 stopped afterwards.

Passed: opened /admin/customers; truthful metrics (2 initially); Add Customer created a third customer with a clear local email limitation; search found the new row; edit saved and displayed its new name; Active filter showed only the customer with orders; Reset restored three rows; CSV download completed and produced easygas-customers.csv; detail dialog displayed three verified historic orders. Existing support/report route links retained.

Desktop 1560px: four metrics and all table columns displayed. At 390px, initial transient resize observation found overflow; responsive CSS was corrected and settled document scrollWidth equalled innerWidth 390. Table itself scrolls horizontally within the directory. Screenshots: docs/screenshots/customer-management-20261030.png and customer-management-mobile-20261030.png.

Not fully verified: screen-reader session, multi-page large datasets, CSV malicious cell fixtures, recovery email delivery (unconnected). Header/sidebar remain the existing workspace shell. Percentage trends omitted because no authoritative comparison series exists. Total spent is gross verified payments; refunds are separately reported in Finance. New customers use account recovery; no generated password is exposed or shared.
