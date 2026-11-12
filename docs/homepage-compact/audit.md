# Homepage audit

The storefront already uses the two-row public header, persisted theme provider, original cooking hero, and compact gas-order component. The approved images guide layout. They supply no business data or replacement hero asset.

The page loads `catalogue?view=homepage` for published products, active service previews, approved testimonials and editorial settings. Product prices and availability come from inventory and gas stock. The quick order uses `gas.catalogue` for versioned active gas, delivery fee and quantity settings and `gas.quote` for the selected location. Checkout, stock reservation and Paystack verification remain in their existing server actions.

The native customer Home already has role-appropriate navigation, an appearance entry and existing order flows. Apply spacing changes only. The working tree contains prior EasyGas changes. Previous isolated PostgreSQL regression passed 676 tests.

The validation snapshot is based on 54b1b15f4e3a926f33973c6c11ab068ce6738cad plus the current local changes. Browser QA exercised both empty and populated synthetic service and coverage states. The populated fixture deliberately changed gas and delivery amounts to verify data binding.
