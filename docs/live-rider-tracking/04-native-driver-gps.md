# Native driver GPS

Continue to use the existing trip consent, Expo Location, background task and encrypted offline queue. The driver enables location for an open consented trip. The configured capture requests approximately 30 m or 30 s with a 60 s background deferral, subject to the OS. These values do not represent guaranteed update intervals. Disconnects, revoked location permissions, OS termination and device reboot can interrupt tracking.

**Stop GPS and withdraw trip consent** stops local capture immediately and requests server withdrawal for the rest of that trip. If disconnected, retry the withdrawal when connected. The server can retain the last accepted observation until sharing expires or it receives the withdrawal. Any unsynchronised GPS evidence remains encrypted for review after withdrawal. Physical custody and other pending trip operations still control trip closure.

The native Maps SDK uses separate iOS and Android keys through the Expo config plugin. Use a fresh native build with the matching bundle/package and signing restrictions. Existing Simulator binaries and Expo Go are insufficient evidence for this setup. [Expo SDK 58 Maps integration](https://docs.expo.dev/versions/v58.0.0/sdk/map-view/).
