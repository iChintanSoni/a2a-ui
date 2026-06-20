# Compare Runs

The Compare Runs view places two saved conversations side by side so you can
see exactly what changed between runs — prompt wording, agent output, artifact
content, and timing.

<!-- Screenshot: TODO — compare runs page -->

---

## Opening a Comparison

1. Go to **Conversations**.
2. Check the boxes on **exactly two** conversations.
3. Click **Compare** in the batch toolbar.

The Compare Runs page opens with the two conversations pre-loaded as "Left"
and "Right".

You can also navigate directly to `/dashboard/compare?left=<chatId>&right=<chatId>`
if you know the conversation IDs (visible in forensic JSON exports).

---

## What Is Compared

### Agent match

A badge at the top indicates whether both runs are against the same agent URL.
If they differ, a warning is shown — comparisons across different agents are
allowed but the differences may not be meaningful.

### Prompt

The user message (or first user message in multi-turn conversations) is shown
side by side. Differences in wording are visible by inspection.

### Output text

The text content of agent responses and status messages is shown side by side.
Diff highlighting calls out added and removed lines.

### Artifacts

For each artifact, the name, MIME type, and text content (if applicable) are
shown side by side. Line-level diffs highlight what changed between the two
runs.

### Timing

A **delta badge** shows whether the Right run was faster or slower than the
Left:

| Badge | Meaning |
|-------|---------|
| "Right run faster by 1.2 s" | Right completed faster |
| "Right run slower by 450 ms" | Right took longer |
| "Same duration" | Within rounding to the nearest ms |
| "Timing unavailable" | One or both runs have no timing data |

Timing is measured from message send to final task state.

---

## Limitations

- **Two runs only.** Compare Runs is a pairwise view. For N-way comparison,
  export conversations and diff them externally.
- **No automatic diffing of binary artifacts.** Image and audio artifacts
  show MIME type and size but not visual/audio diffs.
- **Multi-turn conversations.** Only the first user message and the final
  agent output are shown. Full turn-by-turn diffs are available by opening
  each conversation individually.
