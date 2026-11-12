# Gas order audit

The approved drawing is a layout reference. The current full web form and native GasOrder already support multiple lines, saved delivery data, draft appointments, products and the existing checkout contracts. The homepage uses the separate compact branch of the web component.

The active gas catalogue supplies branch-specific settings and versions. The quote validates selected delivery coverage and stock and returns integer-kobo subtotals. Checkout and mixed checkout remain the only order-writing operations. They revalidate prices, dates, stock and authority under the existing idempotency and approval controls. The last isolated PostgreSQL regression passed 676 tests.
