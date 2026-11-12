# Implementation

- Desktop and mobile web use the existing customer shell. The new workspace adds a compact summary, an offer panel, an editor per active profile and a contextual creation form. The desktop form uses the shared dialog, which becomes a bottom sheet on mobile. The demo banner stays visible below the sheet.
- The Expo customer account opens a native profile workspace with the existing theme and contextual sheets. The existing rewards redemption callback takes eligible offers to the existing product or checkout flow.
- Both clients display server-confirmed supply and Lagos timestamps. Each editor holds its own unsaved selection. Reset returns to the last confirmed selection without a write. The last confirmed selection survives a connection failure and can be checked again before retrying.
- The existing refill overview still embeds the profile workspace. Links to the existing orders, EasyRewards and Smart Refill pages stay available. The design uses the existing EasyGas cylinder artwork.
