# Native mobile Orders preview

21 November 2026. The native Orders text-rendering error is fixed in source. This change is available through the existing Expo Go preview; previously built native binaries are unchanged.

For the Admin/business owner, open **Operations → Orders**. Orders should display without the red “Text strings must be rendered within a Text component” development error. Choose **View visit changes, photos and invoice** on an order to load available visit details. Successful reads display **Current visit details loaded**. Empty photo/invoice results do not create placeholder evidence.

If Expo Go still displays the old error, ensure Metro is running, open the Expo development menu and choose **Reload**. This refreshes source without reinstalling the app or signing out. If Metro is stopped, start the project’s existing preview service first.

The actual iOS check used the existing owner QA session. Delivered-order refund forms separately displayed **Order not found**; those refund workflows remain an open finding and are not accepted by this repair. Do not treat a successful visit read as a completed refund or delivery.

See [repair evidence and screenshot](../mobile-orders-text-fix/README.md) and [traceability](../traceability/mobile-orders-text-fix-rtm.md). Historical PDF/Word editions and production NO-GO remain unchanged.
