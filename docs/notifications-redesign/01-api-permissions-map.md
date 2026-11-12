# API and permissions

| Existing action router | Contract |
| --- | --- |
| GET notifications.list | Authenticated recipient only. Accepts all or unread and a positive page number. Returns eight rows at most, actual counts, effective page and server timestamp in one read-only snapshot. Equal timestamps sort by notification ID. |
| POST notifications.read | Existing UUID action and recipient-scoped first-read timestamp. |
| POST notifications.read.bulk | Strict body with either up to eight selected UUIDs or all true. Updates only the signed-in recipient's unread rows and returns affected and unread counts. |
| GET navigation | Existing staff bell count and bounded preview stay compatible. |

Current admin order links require current Orders navigation access and the order's branch. Existing native customer and field destination guards still apply. No category or approval destination is inferred from notification wording.
