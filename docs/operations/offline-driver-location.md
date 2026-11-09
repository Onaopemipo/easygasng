# Driver offline GPS recording and delayed history

8 November 2026. Source implementation extends existing driver trips, encrypted field queue and trip_events. It does not create another delivery or customer system. Production NO-GO remains. The user deferred mobile builds and server deployment; neither was performed here.

## What offline tracking means

A phone with GPS reception can observe its own position without internet. It cannot transmit a new position to dispatch without a working communications channel. Dispatch therefore sees the last **uploaded** point, its original observation time, accuracy and delayed-upload indicator. The view never labels a point live and never treats upload time as observation time. Do not interpret missing GPS as proof that a driver is offline, absent or at a particular place.

## Native driver flow — available after an approved new native build

1. Open the existing driver workspace. The Trip GPS panel stays mounted across driver tabs/order details.
2. Start a suitable vehicle trip with explicit trip-location consent, or use the existing active trip. The backend retains branch, ownership, capacity and physical-custody guards.
3. Choose Enable offline/background GPS. The driver grants foreground/background location permission. Task Manager/background location support must exist in the binary. Older binaries without the new module retain their existing UI and receive an explicit build-required message; new capabilities cannot be delivered by a web update alone.
4. GPS samples use the device observation timestamp and the same authenticated, encrypted field queue. No token is stored in the background recording lease. iOS keychain access for the existing encrypted field key is explicitly prepared after first unlock, device-only, to support locked-screen capture; data remains encrypted and is not migrated to another customer store.
5. The local work-trip lease expires after eight hours. Capture stops on explicit stop/logout, known invalid trip/account authority, queue/storage errors or lease expiry. Renewal requires a current authenticated server trip. A phone that cannot contact the server cannot learn an immediate remote revocation; the local bound remains. GPS reception, battery restrictions, user force-quit and OS task termination can interrupt capture. No continuous force-quit or powered-off tracking is promised.
6. While the app is foregrounded and connected it attempts GPS synchronisation every30 seconds, or the driver can tap Synchronise. The background task records locally; it does not store an API token or promise headless background upload. Local queue entries are removed only after authenticated server acknowledgement; canonical server history remains. Do not reset/reinstall to clear pending points.
7. Synchronise pending trip records before ending the trip. Existing metered LPG/vehicle custody must also be reconciled. Withdrawn consent, ended/moved trips, stale credentials or event conflicts are held for review, not silently uploaded or discarded.

The queue reserves a persistent GPS sequence high-water mark before writing; emptying an acknowledged queue cannot reset sequence numbers. A crash can leave a sequence gap, not reuse an acknowledged sequence. Up to1000 pending GPS points and300 other records are bounded separately; hitting the bound stops further capture with review feedback instead of silently dropping old evidence. This capacity is not a claim of eight-hour physical-device performance.

## Dispatch view

Existing fleet panels display last recorded GPS time, received time, age and accuracy, with an explicit non-live label. The most recent200 valid coordinate observations are available in a chronological details list; older canonical records remain retained but are not all loaded in that view. Poor-accuracy, invalid and future points do not become displayed current/last-known positions. Existing metric gap/impossible-jump indicators remain. No road route, map interpolation or ETA is fabricated.

The dedicated driver read model returns only their active branch trip and eligible vehicle labels. Delivery-only sessions may start/end their guarded trip and sync **GPS only**; fuel/status/cash/financial or fleet-wide reads remain denied. Staff retain existing branch/role scoping. Customer live GPS/ETA remains disabled; this phase does not publish staff location to customers.

## Verification and remaining gates

Evidence under docs/production-completion/evidence/offline-gps-* includes focused backend/domain/security tests, web production build, web/native typechecking and matrix validation. Tests exercise delayed observation/receipt times, stale/future/off-duty handling, replay, scope/consent rejection and persistent sequence selection. They do not execute real iOS/Android Task Manager, SecureStore/FileSystem crash behaviour, permission dialogs, locked-screen capture or eight-hour battery/storage performance.

No native build/export/signing, physical travel, server deployment or real driver location collection occurred. Required next acceptance: new native binaries; two real phones; consent/deny/revoke; airplane mode with GPS retained; screen lock/background; app kill/restart; duplicate callback/receipt recovery; queue bound/full disk; reconnect and original timestamps; logout/account switching; trip end/remote revocation; role/branch checks. Keep the production release blocked until applicable gates pass.

Configuration references: https://docs.expo.dev/versions/latest/sdk/location/ and https://docs.expo.dev/versions/latest/sdk/task-manager/ .
