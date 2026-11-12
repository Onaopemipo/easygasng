# Routing and configuration

The governed OSRM-compatible estimator remains the road-routing provider. It continues to require the existing operational and finance gates, a verified destination and eligible recent GPS. No route line is sent to the new map and no customer fee, collection status or ETA derives from it.

| Variable | Purpose |
| --- | --- |
| `EASYGAS_CUSTOMER_RIDER_GPS_ENABLED` | Server customer-sharing gate, default false |
| `EASYGAS_CUSTOMER_RIDER_GPS_MAX_AGE_SECONDS` | Customer freshness threshold, 15–120 seconds, default 90 |
| `NEXT_PUBLIC_EASYGAS_GOOGLE_MAPS_ENABLED` | Build-time web map gate, default false |
| `NEXT_PUBLIC_EASYGAS_GOOGLE_MAPS_BROWSER_KEY` | Existing browser key restricted to Maps JavaScript API and approved site referrers |
| `NEXT_PUBLIC_EASYGAS_GOOGLE_MAPS_MAP_ID` | Approved web map ID for Advanced Markers |
| `EASYGAS_NATIVE_GOOGLE_MAPS_ENABLED` | Native build gate, default false |
| `EASYGAS_GOOGLE_MAPS_IOS_KEY` | Existing iOS Maps SDK key restricted to the installed bundle |
| `EASYGAS_GOOGLE_MAPS_ANDROID_KEY` | Existing Android Maps SDK key restricted to the package and signing fingerprint |
| `EASYGAS_OSRM_ORIGIN`, `EASYGAS_ROAD_ROUTING_ENABLED` | Existing server-only trusted HTTPS origin and routing gate |

No key values were read into task output. Production referrer restrictions, quotas, billing, API activation and hosted content-security policy require separate verification. Browser and native SDK keys are distributed to their clients and require platform restrictions. Keep payment and unrelated feature flags on their existing settings.
