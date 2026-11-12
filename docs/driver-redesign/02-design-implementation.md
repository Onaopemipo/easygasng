# Driver screens

| Screen | Changes |
| --- | --- |
| Home | The dispatch availability card keeps its layout when toggled. Assignment counts and the last backend contact come from the scoped driver snapshot. GPS permission and trip consent have their own labels. |
| Orders | Current assignments show actual items and status. Responses use the current assignment version and existing expiry. Directions require the latest dispatch-confirmed pin for the current address. |
| History | Closed delivery attempts are filterable by outcome and Lagos date. Server-side pagination preserves range totals. A closed attempt opens a read-only record. |
| Profile | Shows authenticated identity, branch, confirmed trip vehicle, security, help and app settings. Vehicle and compliance details are read-only. |

The web workspace uses the existing `/admin/deliveries` route and shell. Web supports acknowledgement and decline. Inspected pickup, evidence capture, trip location, and custody stay in the native driver workflow. Both native entry points use the existing shared driver workspace. Available-order claiming, scanning and editable compliance controls were omitted because they lack a verified driver workflow.
