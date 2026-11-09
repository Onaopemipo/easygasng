# Canonical customer integration

No customer/identity/order/wallet/inventory/payment/notification database was created. Existing dispatch remains authoritative. App.tsx owns secure session/cart and staff routing; existing GasOrder, CombinedCheckout, Services, Workflows, OrderVisit and EasyRewards keep their domain handlers.

Additive read-only customer.dashboard widgets: cylinders selects customer-owned physical rows by authenticated actor ID; invoices joins canonical customer_invoices/orders with both owner predicates and bounded indexed issued history. Schema and permissions are unchanged. Staff access to this customer read model is rejected; customer-supplied identity fields fail strict validation.

CustomerUI useRemote performs GET-compatible query reads, cancels stale UI effects on unmount and is keyed per account by the root. Actual HTTP tests verify 200 GET and preserved 405 POST restrictions. Invoices uses invoice.order for canonical balances, GET /api/invoices/[orderId] for existing private audited PDF. Bearer tokens are never placed in document URLs; random temporary files are removed after native sharing. No fake PDF/receipt generation.

Existing orders endpoint provides actual status events, assigned driver where permitted and disabled GPS; existing polling refetches authoritative state. Notifications related routing and native links only target allowlisted screens; order selectors are validated UUIDs and server ownership still applies. Secure assisted completion URLs remain the canonical web flow, not permanent native login credentials. Native one-time assisted completion is not newly certified.

No migrations, live payments, push/SMS/WhatsApp activation, permissions expansion or data import. Existing pending finance/amendment/vehicle-stock and release restrictions remain in their earlier matrices.
