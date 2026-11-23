"""Verify the exact signed iOS TestFlight refresh; never builds or installs it."""
import argparse
import datetime as dt
import hashlib
import json
from pathlib import Path
import plistlib
import subprocess
import tempfile
import zipfile

parser = argparse.ArgumentParser()
parser.add_argument("--ipa", type=Path, required=True)
parser.add_argument("--build-id", required=True)
parser.add_argument("--build-number", required=True)
parser.add_argument("--source", required=True)
parser.add_argument("--report", type=Path, required=True)
args = parser.parse_args()
checks = []


def run(*command):
    return subprocess.run(command, capture_output=True, check=True).stdout


def check(identifier, description, valid):
    if not valid:
        raise AssertionError(f"{identifier}: {description}")
    checks.append({"id": identifier, "description": description, "status": "PASS"})
    print(f"✔ {identifier}: {description}", flush=True)


with tempfile.TemporaryDirectory(prefix="easygas-ios-artifact-") as temp:
    root = Path(temp).resolve()
    with zipfile.ZipFile(args.ipa) as archive:
        for entry in archive.infolist():
            target = (root / entry.filename).resolve()
            if target != root and root not in target.parents:
                raise ValueError("Unsafe archive path")
        archive.extractall(root)
    apps = list((root / "Payload").glob("*.app"))
    check("IOS23-A01", "Exactly one signed device application in the IPA", len(apps) == 1)
    app = apps[0]
    info = plistlib.loads((app / "Info.plist").read_bytes())
    subprocess.run(["codesign", "--verify", "--deep", "--strict", str(app)], check=True, capture_output=True)
    signer = subprocess.run(["codesign", "-dvv", str(app)], check=True, capture_output=True).stderr.decode()
    profile = plistlib.loads(run("security", "cms", "-D", "-i", str(app / "embedded.mobileprovision")))
    check("IOS23-A02", "Signature, provisioning team and bundle identity match EasyGas", "TeamIdentifier=RDQ9JJZH7F" in signer and profile["TeamIdentifier"] == ["RDQ9JJZH7F"] and profile["Entitlements"]["application-identifier"] == "RDQ9JJZH7F.com.easygasng.customer" and info["CFBundleIdentifier"] == "com.easygasng.customer")
    check("IOS23-A03", "Exact version/build is an iPhone+iPad App Store device archive without development access", info["CFBundleShortVersionString"] == "0.1.0" and info["CFBundleVersion"] == args.build_number and info["DTPlatformName"] == "iphoneos" and info["UIDeviceFamily"] == [1, 2] and profile["Entitlements"]["get-task-allow"] is False and "ProvisionedDevices" not in profile)
    check("IOS23-A04", "Distribution profile remains valid", profile["ExpirationDate"].replace(tzinfo=dt.timezone.utc) > dt.datetime.now(dt.timezone.utc))
    script = (app / "main.jsbundle").read_bytes()
    check("IOS23-A05", "Compiled JavaScript includes the approved hosted testing API", b"https://easygas-client-demo.vercel.app" in script)
    orientations = info.get("UISupportedInterfaceOrientations", [])
    ipad_orientations = info.get("UISupportedInterfaceOrientations~ipad", orientations)
    expected = {"UIInterfaceOrientationPortrait", "UIInterfaceOrientationLandscapeLeft", "UIInterfaceOrientationLandscapeRight"}
    check("IOS23-A06", "Packaged iPhone and iPad orientations retain the portrait/landscape repair", expected.issubset(orientations) and expected.issubset(ipad_orientations))
    schemes = [s for item in info.get("CFBundleURLTypes", []) for s in item.get("CFBundleURLSchemes", [])]
    check("IOS23-A07", "Packaged native URL scheme includes easygas", "easygas" in schemes)
    architecture = run("lipo", "-archs", str(app / info["CFBundleExecutable"])).decode().strip()
    check("IOS23-A08", "Application executable contains the arm64 device architecture", "arm64" in architecture.split())
    report = {"scope": "Static verification of the exact signed iOS refresh; not installed-device/lifecycle acceptance", "buildId": args.build_id, "packagingCommit": args.source, "version": info["CFBundleShortVersionString"], "buildNumber": info["CFBundleVersion"], "bundleIdentifier": info["CFBundleIdentifier"], "appleTeamId": profile["TeamIdentifier"][0], "deviceFamilies": info["UIDeviceFamily"], "architectures": architecture, "minimumOSVersion": info["MinimumOSVersion"], "profileUUID": profile["UUID"], "profileExpires": profile["ExpirationDate"].isoformat(), "orientations": orientations, "ipadOrientations": ipad_orientations, "urlSchemes": schemes, "encryptionDeclaration": info.get("ITSAppUsesNonExemptEncryption"), "apiOrigin": "https://easygas-client-demo.vercel.app", "checks": checks, "productionDecision": "NO-GO preserved; internal TestFlight testing only"}
    digest = hashlib.sha256()
    with args.ipa.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    report["sha256"] = digest.hexdigest()
    report["bytes"] = args.ipa.stat().st_size
    args.report.write_text(json.dumps(report, indent=2) + "\n")
print(f"ℹ tests {len(checks)}\nℹ pass {len(checks)}\nℹ fail 0\nℹ skipped 0")
