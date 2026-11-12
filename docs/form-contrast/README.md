# Form contrast audit

The native input wrapper applied dark-mode text while some callers still supplied a white background. The wrapper now takes field text, background, border, placeholder, selection and password-icon colours from the resolved appearance. Shared account and support forms and sign-in no longer supply fixed input colours. Owner Approvals and Sales Customer Lookup now use the same native input wrapper as the other mobile screens. The web theme applies explicit placeholder colours and retains the selected palette for autofill.

Chromium visited 75 routes at 1440 px in light mode and 390 px in dark mode. The sweep included public pages, customer pages, the permitted administration routes and a service detail. It measured the computed text and placeholder contrast against the effective background of 267 visible controls per mode. No checked control fell below 4.5:1. Record-specific forms that require additional business data and unexercised interaction states are outside the browser evidence. [Route results](evidence/browser.txt).

Installed iPhone and Android emulator checks loaded the synthetic profile, confirmed the prefilled name, edited the name without submitting, and reached the support search in both themes. The Android test used an unminified local build. [Native results](evidence/native.txt) · [iPhone dark](evidence/ios-dark-profile.png) · [iPhone light](evidence/ios-light-profile.png) · [Android dark](evidence/android-dark-profile.png) · [Android light](evidence/android-light-profile.png).

Web build, both type checks and all seven focused contrast, appearance and password tests passed. [Regression evidence](evidence/regression.txt). Production remains NO-GO.
