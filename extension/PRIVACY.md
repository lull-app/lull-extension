# lull Privacy

## What lull sends (Live Mode only — when backendUrl is set)
- Anonymous random UUID (generated locally, never linked to your identity)
- Timestamp of the impression
- Whether the VS Code window was in focus

## What lull NEVER sends
- Your prompts or messages to AI tools
- Your code or file contents
- File names or paths
- AI responses or outputs
- Any personally identifiable information

## Demo Mode (default)
When no `lull.backendUrl` is configured, lull runs entirely offline. No data leaves your machine.

## How to reset your ID
Run the command `lull: Reset my ID` from the Command Palette (⌘⇧P). A new random UUID is generated immediately.

## Source code
All code is open source. Read it: https://github.com/lull-app/lull-extension-v2
