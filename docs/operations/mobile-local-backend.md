# Connected local mobile demo

The iPhone simulator app is **EasyGas Local**, bundle `com.easygasng.customer.local`. It connects to the existing backend at `http://127.0.0.1:3003` and uses the same EasyGas accounts as the website. Existing passwords were not changed. The production app identifier and HTTPS-only production profile remain separate.

From the repository root:

```sh
npm run dev
```

In a second terminal, rebuild/start the iOS simulator demo when needed:

```sh
npm --prefix apps/mobile run ios:local
```

The Android emulator command uses its host loopback alias `10.0.2.2`:

```sh
npm --prefix apps/mobile run android:local
```

Android installation was not exercised in this phase. These local endpoints do not connect a physical phone to the Mac. Physical devices require a reachable approved backend; production uses HTTPS after hosting is provisioned. Never enable arbitrary public HTTP or publish the local-demo profile as production.

The local app was left on **Sign In** in the iPhone 17 Pro simulator. Use the existing web email/password, or the activated phone-number option when applicable. Native authentication is handled by the same backend and retains existing role/branch controls.

Verified 5 November 2026: native app loaded backend catalogue/prices, sign-in reached backend authentication and rejected a synthetic nonexistent account with the normal credentials error. Synthetic fields were cleared. No actual account/session credential was retrieved or changed, and no order, payment or import was created. SecureStore remains the session/offline key store.

The backend must stay running on port3003. Overall production NO-GO and Excel import hold remain unchanged.
