# Rollback and release decision

Base `46fde7ee76fc930f27b044832f735cfd68afa85b`; feature branch `codex/authentication-redesign`. Review the exact ten existing frontend files and eight additions listed in reviewed-source-changes.json. Backend/schema/auth policy unchanged.

Rollback reverts only this phase’s frontend presentation/request files and their imports, then rebuilds/rechecks the existing application. Never restore older identity/session/database records, tokens or customer data. Keep all historical traceability and original release decisions.

**Release decision: NO-GO.** Implementation/testing is local only. No production/client-demo deployment, new OAuth/provider activation, mobile bundle export, signed binary, store upload or public release is authorised by this handoff. Current signed iOS 0.1.0(4), Android 2 and existing demo are unchanged. Remaining iOS keyboard/iPad, dedicated staff keyboard, positive native entry, physical-device and VoiceOver/TalkBack acceptance must remain in denominators and block release where required. Original platform-wide production NO-GO, physical/provider/import/retain-all holds remain authoritative.

The initial Device Hub launch handoff was completed. Actual bounded iOS phone and Android phone/tablet observations are now in 06-native-followup.md. The user-approved Android phone permission, reconnect, keyboard/Back, customer sign-in/restoration and logout checks passed. Remaining iOS software-keyboard/iPad, dedicated staff keyboard, positive native entry, physical and assistive gates remain open. Prior signed apps and renderer/type checks cannot substitute for these remaining gates.
