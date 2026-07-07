# lull Privacy

## What lull sends (Live Mode only — when backendUrl is set)
- Anonymous random UUID (generated locally, never linked to your identity)
- Timestamp of the impression
- Whether the VS Code window was in focus

## What lull NEVER sends or reads
- Your prompts or messages to AI tools
- Your code or file contents
- File names or paths
- AI responses or outputs
- Terminal output/contents
- Any personally identifiable information

## How activity is detected
lull detects whether Claude Code is generating via a small local state file (`~/.lull/activity.json`) written by Claude Code lifecycle hooks (timestamp + state only, e.g. `"start"`/`"tool"`/`"stop"`). lull does not read your terminal, prompts, or code to do this. Installing the hook into `~/.claude/settings.json` requires your explicit consent on first activation — decline and lull won't touch that file. You can remove it anytime via `lull: Remove lull from Claude settings`.

## Demo Mode (default)
When no `lull.backendUrl` is configured, lull runs entirely offline. No data leaves your machine. Earnings shown in the sidebar are a simulation — there is no live payout backend yet.

## How to reset your ID
Run the command `lull: Reset my ID` from the Command Palette (⌘⇧P). A new random UUID is generated immediately.

## Source code
All code is open source. Read it: https://github.com/lull-app/lull-extension
