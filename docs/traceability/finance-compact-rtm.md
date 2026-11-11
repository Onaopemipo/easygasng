# Compact finance continuation

The existing web overview uses the finance fields from business.snapshot. The native Finance Officer view reuses the same authorised snapshot. Null profit is displayed as unavailable. The web quick-actions panel opens the existing expense form and uses its independent approval workflow. The snapshot lacks a dated revenue series for this view.

Web and native typechecks and 26 inventory, finance, product UI and navigation tests passed. These cover independent expense approval, branch isolation and existing route registration. Browser and simulator acceptance remain open.

Rollback consists of reinstalling the previous compatible native build or redeploying the previous compatible web build. No schema migration is required. Production remains NO-GO.

[Screen and gate matrix](finance-compact-rtm.json)
