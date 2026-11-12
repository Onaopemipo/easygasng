# Web and mobile implementation

`/refill` renders a dedicated Smart Refill variant of the existing profile workspace. The existing sidebar and header frame a compact title, summary, offers, profile editor and conditional activity. The verified cylinder art comes from the application assets. The related `/consumption` workspace keeps its route and recurring-refill summary.

Native Home and Account Hub open Smart Refill. Both native modes share the existing create and supply flows, theme context and authenticated API client. Small forms use the existing contextual modal or native sheet. A Smart Refill order link goes to the existing owned order screen.

Reset clears the local draft. A successful save updates the UI from the server response and rechecks the profile. The profile activity panel appears only when a verified delivery or saved supply report exists. The estimate remains labelled as an estimate and self-reports remain distinct.
