# Permission-aware menu visibility

Administration navigation links now share the server-provided allowed route list. The grouped sidebar remains unchanged. Dashboard shortcuts, service tabs, notification links and other shared Link surfaces hide unauthorised /admin destinations. Public and customer surfaces outside the provider retain their normal links. URL query strings and fragments do not change the permission decision. Empty groups remain filtered by the existing sidebar.

Navigation applies explicit route revocations after grants so another operation cannot restore a revoked menu. Server-side role, branch, privilege and operation checks remain mandatory. A successful navigation refresh redirects away from a revoked current module to the first available route; an account with no assigned menus receives neutral guidance.

20 focused menu, navigation and staff privilege regressions pass. Web typecheck and production build pass. Actual browser/hosted acceptance is not claimed; deployment pending. This phase covers navigation menus and links, not an exhaustive audit of every mutation button or record-specific eligibility rule. Existing production NO-GO and earlier pending work remain.
