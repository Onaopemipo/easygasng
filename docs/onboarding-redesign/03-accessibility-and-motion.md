# Accessibility and motion

Web dialog puts focus on Skip on entry, contains Tab/Shift-Tab, supports arrows plus named progress controls, dismisses with Escape and returns focus to the opener. Screen readers can access headings and scene announcements without reading the decorative imagery. Layout was checked at 320, 375, 390, 768, 1024, 1440 and 1920 CSS pixels. The footer stays reachable as scene content scrolls.

Native uses safe area insets, scalable text, a scrollable scene, 48-point progress and Skip targets and fixed-height-minimum rather than clipped text. Modal back returns to the previous scene before closing at the first. Use swipe or progress controls to interrupt an entrance; repeated Next taps within 250ms are ignored. Native uses the OS reduced motion preference; web uses the media query. Both transitions use a short slide/fade without video or continuous motion. Photography falls back to an evergreen background and live content.

VoiceOver/TalkBack, native 200% type, tablet/landscape and low-end performance still require direct validation. No screenshot, source inspection or compile is treated as those checks passing.
