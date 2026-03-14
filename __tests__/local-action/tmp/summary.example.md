## Issue PR Labeler

> Issue: [Issue title](https://github.com/OWNER/REPO/issues/123)
>
> ⚠️ Dry-run mode enabled: no changes were applied.
>
> ⚙️ Settings: dryRun=false, onMissingLabel=create, removeUnmatchedLabels=true, skipIfBot=true

### Actions Performed

| Action    | Count |
| --------- | ----- |
| ➕ Add    | 2     |
| ➖ Remove | 4     |
| ▫️ None   | 1     |

### Outcomes Summary

| Result     | Count |
| ---------- | ----- |
| 🟢 Success | 2     |
| 🔴 Failed  | 1     |
| 🟡 Skipped | 3     |
| ⚪ Noop    | 1     |

> `Skipped`: Tried to add/remove, but skipped due to policy or current state.
>
> `Noop`: Does nothing because it is not a target for add/remove.

### Reasons for Outcomes

| Reason                      | Count |
| --------------------------- | ----- |
| already_absent              | 3     |
| -                           | 2     |
| api_error                   | 1     |
| missing_label_create_policy | 1     |

### Details by Label

| Label    | Action    | Result     | Reason                      |
| -------- | --------- | ---------- | --------------------------- |
| draft    | ➖ Remove | 🟡 Skipped | already_absent              |
| external | ➕ Add    | 🟢 Success | -                           |
| feature  | ➖ Remove | 🟡 Skipped | already_absent              |
| frontend | ➖ Remove | 🔴 Failed  | api_error                   |
| hotfix   | ➖ Remove | 🟡 Skipped | already_absent              |
| large-pr | ➕ Add    | 🟢 Success | missing_label_create_policy |
| ready    | ▫️ None   | ⚪ Noop    | -                           |
