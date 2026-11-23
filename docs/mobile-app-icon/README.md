# Approved EasyGas app icon — 24 November 2026

The user selected the **first draft**, `exec-a88fc335-796d-4987-accf-0c59e16d0c8b.png`: orange flame with a white centre on deep green. This explicit choice supersedes the alternative flame-and-e previews.

The approved file is copied **byte-for-byte** to `apps/mobile/assets/app-icon.png`. It is an opaque1254×1254PNG. No recolouring, redrawing, cropping, added corners or resizing was applied. The persistent project file replaces the former icon at the path already used by all mobile configurations.

## Executed verification

[Asset/config readback](evidence/asset-and-config.json), [four executed checks](evidence/asset-and-config.txt).

1. Compare the attachment and project PNG bytes and SHA-256; require exact equality.
2. Decode with the project's installed Sharp library; verify PNG, square dimensions of at least1024px and fully opaque pixels.
3. Resolve actual Expo public configurations using installed `@expo/config.getConfig` in separate processes for unified preview, unified store-signing, driver-local and technician-local. Use the installed Expo iOS `getIcons` and Android `getIcon` selectors, rather than checking the root path string alone. All eight platform selectors resolve to the approved shared asset. Store identities remain `com.easygasng.customer`.
4. Compare committed configuration files, in-app transparent logo and web favicon to the working tree; all are unchanged. Local role-shell release guards and API configuration guards are retained.

The installed Expo native icon pipeline handles platform sizes during the next native generation/build. No prebuild, native project generation, JS export, binary build, simulator install, store upload or hosted deployment was performed. The initial evidence-export attempt hit Node's1MB subprocess output limit when reading the former icon from Git; rerunning with a16MB bound completed all four checks and saved the report. No application/build failure occurred.

## Release and acceptance boundary

Current TestFlight **0.1.0(3)** and Android store **0.1.0(2)** contain their previously packaged icons. Source replacement does not alter those installed applications. New signed builds and installed-device/launcher/store readback remain pending; Android OEM masking/themed icons and iOS appearance variants are not certified by this source check.

The in-app wordmark, onboarding artwork and web favicon retain their existing assets. The unrelated Dispatch/fleet redesign working changes are preserved. Existing production NO-GO and native/provider/physical/import/retention decisions remain unchanged.

[Traceability matrix](../traceability/mobile-app-icon-rtm.md): four requirements retained; three source/documentation requirements verified, one installed-appearance gate pending, zero excluded.

Final existing configuration contracts: **5passed,0failed,0skipped** ([output](evidence/configuration-contracts.txt)); final traceability checks: **2passed,0failed,0skipped** ([output](evidence/traceability-final.txt)). The initial matrix validation identified a missing PR-07 evidence link; that link is corrected and the final matrix checks pass. Installed appearance remains pending rather than being counted as passed.
