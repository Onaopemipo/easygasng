"""Inspect the actual EAS beta artifacts without installing or rebuilding them.

Run from the repository root after downloading the two exact build IDs recorded
in docs/store-testing-20261123/preflight.json to .data/store-artifacts.
Signing keys and authenticated download URLs are never written to evidence.
"""
import hashlib
import json
from pathlib import Path
import plistlib
import subprocess
import xml.etree.ElementTree as ET
import zipfile

ROOT = Path(__file__).resolve().parents[1]
ARTIFACTS = ROOT / ".data/store-artifacts"
REPORT = ROOT / "docs/store-testing-20261123/artifact-verification.json"
API = b"https://easygas-client-demo.vercel.app"
PACKAGE = "com.easygasng.customer"
TEAM = "RDQ9JJZH7F"
FINGERPRINT = "6D:53:47:3E:14:02:45:8F:FD:97:43:33:77:65:4B:B5:79:EA:2A:FC:63:BD:95:D0:A3:57:58:C2:C2:B9:AA:CD"
checks = []


def run(*args):
    result = subprocess.run(args, capture_output=True, text=True, check=True)
    return result.stdout + result.stderr


def check(identifier, description, condition):
    if not condition:
        raise AssertionError(f"{identifier}: {description}")
    checks.append(identifier)
    print(f"✔ {identifier}: {description}", flush=True)


def digest(path):
    result = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            result.update(chunk)
    return result.hexdigest()


android = ARTIFACTS / "EasyGas-0.1.0-2.aab"
ios = ARTIFACTS / "EasyGas-0.1.0-2.ipa"
run("bundletool", "validate", f"--bundle={android}")
signature = run("jarsigner", "-verify", str(android))
certificate = run("keytool", "-printcert", "-jarfile", str(android))
check("STORE23-A01", "AAB structure and signature valid; upload certificate matches dedicated EasyGas EAS key", "jar verified." in signature and FINGERPRINT in certificate)
manifest = ET.fromstring(run("bundletool", "dump", "manifest", f"--bundle={android}", "--module=base"))
ns = "{http://schemas.android.com/apk/res/android}"
application = manifest.find("application")
sdk = manifest.find("uses-sdk")
check("STORE23-A02", "Android package/version exact; device release is not debuggable and platform cleartext default is disabled", manifest.attrib["package"] == PACKAGE and manifest.attrib[ns + "versionName"] == "0.1.0" and manifest.attrib[ns + "versionCode"] == "2" and application.attrib.get(ns + "debuggable", "false") == "false" and application.attrib.get(ns + "usesCleartextTraffic", "false") == "false" and int(sdk.attrib[ns + "targetSdkVersion"]) >= 28)
with zipfile.ZipFile(android) as bundle:
    config = json.loads(bundle.read("base/assets/app.config"))
    script = bundle.read("base/assets/index.android.bundle")
check("STORE23-A03", "Android packaged config disables cleartext and compiled JS includes approved hosted demo API", config["android"]["usesCleartextTraffic"] is False and config["extra"]["eas"]["projectId"] == "1c2f8055-9c7b-4d6e-bc43-a531544da41b" and API in script)

extracted = ARTIFACTS / "ios-verified"
with zipfile.ZipFile(ios) as archive:
    for member in archive.infolist():
        target = (extracted / member.filename).resolve()
        if extracted.resolve() not in target.parents and target != extracted.resolve():
            raise ValueError("Unsafe IPA archive path")
    archive.extractall(extracted)
app = next((extracted / "Payload").glob("*.app"))
info = plistlib.loads((app / "Info.plist").read_bytes())
run("codesign", "--verify", "--deep", "--strict", str(app))
signer = run("codesign", "-dvv", str(app))
profile = plistlib.loads(subprocess.run(["security", "cms", "-D", "-i", str(app / "embedded.mobileprovision")], check=True, capture_output=True).stdout)
check("STORE23-I01", "IPA signature and provisioning identity match EasyGas bundle and authorised Apple team", f"TeamIdentifier={TEAM}" in signer and profile["TeamIdentifier"] == [TEAM] and profile["Entitlements"]["application-identifier"] == f"{TEAM}.{PACKAGE}")
check("STORE23-I02", "iPhone/iPad device release is version 0.1.0 build 2 with debugging disabled and App Store profile", info["CFBundleIdentifier"] == PACKAGE and info["CFBundleShortVersionString"] == "0.1.0" and info["CFBundleVersion"] == "2" and info["DTPlatformName"] == "iphoneos" and info["UIDeviceFamily"] == [1, 2] and profile["Entitlements"]["get-task-allow"] is False and "ProvisionedDevices" not in profile)
check("STORE23-I03", "iOS compiled JS includes the approved hosted demo API", API in (app / "main.jsbundle").read_bytes())

REPORT.write_text(json.dumps({
    "scope": "Static verification of actual signed beta artifacts; no physical-device or whole-app acceptance implied",
    "sourceCommit": "b7a53c9d7d70dd20ce31cc1326874e42b7880784",
    "apiOrigin": API.decode(),
    "android": {"buildId": "cff563ba-a3ca-4f30-af65-5ccd1c1add52", "sha256": digest(android), "bytes": android.stat().st_size, "package": PACKAGE, "version": "0.1.0", "versionCode": 2, "targetSdk": int(sdk.attrib[ns + "targetSdkVersion"]), "uploadCertificateSha256": FINGERPRINT, "signatureNote": "Self-signed upload certificate is expected; jarsigner verified archive integrity and exact EAS fingerprint matched."},
    "ios": {"buildId": "1c0441d6-cf78-485d-b56b-47e817093e3a", "sha256": digest(ios), "bytes": ios.stat().st_size, "bundleIdentifier": PACKAGE, "version": "0.1.0", "buildNumber": "2", "team": TEAM, "profileUUID": profile["UUID"], "minimumOSVersion": info["MinimumOSVersion"], "deviceFamilies": info["UIDeviceFamily"], "nonExemptEncryptionDeclaration": info.get("ITSAppUsesNonExemptEncryption"), "exportCompliance": "Not automatically declared exempt: TweetNaCl secretbox is used by field-crypto.ts. Resolve Apple's actual compliance prompt separately."},
    "checks": checks,
    "productionDecision": "NO-GO unchanged; test-store distribution only"
}, indent=2) + "\n")
print(f"ℹ tests {len(checks)}\nℹ pass {len(checks)}\nℹ fail 0\nℹ skipped 0")
