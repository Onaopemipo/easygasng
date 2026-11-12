# Web dispatcher map

Open the existing Dispatch Centre and select **Show Google Maps** when the browser map is configured and authorised observations exist. The current branch filter governs the fleet. Driver and location-status filters narrow the map. Up to 50 eligible points render, and the complete scoped driver list remains available. Marker titles include rider, observation time, accuracy and active stops; selecting a marker focuses the associated driver details. Existing order actions and external-map links remain available.

The JavaScript SDK is requested on demand. An unavailable key, loader error or timeout leaves the accessible list in place. The list distinguishes observation age and delayed uploads. Old observations are static and there are no fallback coordinates. API calls for the fleet are batched in the existing dispatch snapshot rather than issuing two separate queries per driver.

Provider documentation: [Google Maps JavaScript loader](https://developers.google.com/maps/documentation/javascript/load-maps-js-api), [Advanced Markers and map IDs](https://developers.google.com/maps/documentation/javascript/advanced-markers/start).
