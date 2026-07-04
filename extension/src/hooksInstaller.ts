import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const LULL_DIR = path.join(os.homedir(), '.lull');
const HOOKS_DIR = path.join(LULL_DIR, 'hooks');
const HOOK_SCRIPT = path.join(HOOKS_DIR, 'activity.sh');
const CLAUDE_DIR = path.join(os.homedir(), '.claude');
const CLAUDE_SETTINGS = path.join(CLAUDE_DIR, 'settings.json');
const SETTINGS_BACKUP = path.join(LULL_DIR, 'settings.backup.json');
const HOOK_MARKER = '~/.lull/hooks/activity.sh';

const HOOK_SCRIPT_CONTENT = `#!/bin/sh
# lull activity signal - written by Claude Code lifecycle hooks.
STATE_DIR="$HOME/.lull"
mkdir -p "$STATE_DIR"
printf '{"state":"%s","ts":%s}' "$1" "$(date +%s)" > "$STATE_DIR/activity.json"
`;

type ClaudeHookCommand = {
  type: 'command';
  command: string;
};

type ClaudeHookEntry = {
  matcher: string;
  hooks: ClaudeHookCommand[];
};

type ClaudeSettings = {
  hooks?: Record<string, unknown>;
  spinnerVerbs?: unknown;
  [key: string]: unknown;
};

const LULL_HOOKS: Array<[string, string]> = [
  ['UserPromptSubmit', 'sh ~/.lull/hooks/activity.sh start'],
  ['PostToolUse', 'sh ~/.lull/hooks/activity.sh tool'],
  ['Stop', 'sh ~/.lull/hooks/activity.sh stop'],
];

export function installLullHooksAndSettings(spinnerVerb: string): void {
  fs.mkdirSync(LULL_DIR, { recursive: true });
  backupSettingsOnce();
  ensureHookScript();
  updateClaudeSettings(settings => {
    addLullHooks(settings);
    settings.spinnerVerbs = [spinnerVerb];
  });
}

export function restoreClaudeSettings(): void {
  if (!fs.existsSync(CLAUDE_SETTINGS)) return;

  updateClaudeSettings(settings => {
    removeLullHooks(settings);
    delete settings.spinnerVerbs;
  });
}

function ensureHookScript(): void {
  fs.mkdirSync(HOOKS_DIR, { recursive: true });
  fs.writeFileSync(HOOK_SCRIPT, HOOK_SCRIPT_CONTENT, { encoding: 'utf8', mode: 0o755 });
  fs.chmodSync(HOOK_SCRIPT, 0o755);
}

function updateClaudeSettings(mutator: (settings: ClaudeSettings) => void): void {
  fs.mkdirSync(CLAUDE_DIR, { recursive: true });
  fs.mkdirSync(LULL_DIR, { recursive: true });
  backupSettingsOnce();

  const settings = readClaudeSettings();
  mutator(settings);
  fs.writeFileSync(CLAUDE_SETTINGS, `${JSON.stringify(settings, null, 2)}\n`, 'utf8');
}

function backupSettingsOnce(): void {
  if (fs.existsSync(SETTINGS_BACKUP)) return;

  const original = fs.existsSync(CLAUDE_SETTINGS)
    ? fs.readFileSync(CLAUDE_SETTINGS, 'utf8')
    : '{}\n';
  fs.writeFileSync(SETTINGS_BACKUP, original, 'utf8');
}

function readClaudeSettings(): ClaudeSettings {
  if (!fs.existsSync(CLAUDE_SETTINGS)) return {};

  const raw = fs.readFileSync(CLAUDE_SETTINGS, 'utf8').trim();
  if (!raw) return {};

  const parsed = JSON.parse(stripJsonComments(raw));
  return isPlainObject(parsed) ? parsed as ClaudeSettings : {};
}

function addLullHooks(settings: ClaudeSettings): void {
  if (!isPlainObject(settings.hooks)) settings.hooks = {};
  const hooks = settings.hooks as Record<string, unknown>;

  for (const [eventName, command] of LULL_HOOKS) {
    const eventHooks = Array.isArray(hooks[eventName]) ? hooks[eventName] as unknown[] : [];
    if (!eventHooks.some(entry => hookEntryHasCommand(entry, command))) {
      eventHooks.push({ matcher: '', hooks: [{ type: 'command', command }] });
    }
    hooks[eventName] = eventHooks;
  }
}

function removeLullHooks(settings: ClaudeSettings): void {
  if (!isPlainObject(settings.hooks)) return;

  const hooks = settings.hooks as Record<string, unknown>;
  for (const eventName of Object.keys(hooks)) {
    if (!Array.isArray(hooks[eventName])) continue;

    const cleaned = (hooks[eventName] as unknown[])
      .map(removeLullCommandsFromEntry)
      .filter(entry => entry !== undefined);

    if (cleaned.length > 0) {
      hooks[eventName] = cleaned;
    } else {
      delete hooks[eventName];
    }
  }

  if (Object.keys(hooks).length === 0) delete settings.hooks;
}

function removeLullCommandsFromEntry(entry: unknown): unknown | undefined {
  if (!isPlainObject(entry)) return entry;

  const record = entry as Record<string, unknown>;
  if (!Array.isArray(record.hooks)) return entry;

  const nextHooks = record.hooks.filter(command => !hookCommandHasMarker(command));
  if (nextHooks.length === record.hooks.length) return entry;
  if (nextHooks.length === 0 && Object.keys(record).every(key => key === 'matcher' || key === 'hooks')) return undefined;

  return { ...record, hooks: nextHooks };
}

function hookEntryHasCommand(entry: unknown, command: string): boolean {
  if (!isPlainObject(entry)) return false;
  const hooks = (entry as Record<string, unknown>).hooks;
  return Array.isArray(hooks) && hooks.some(item => {
    return isPlainObject(item) && (item as Record<string, unknown>).command === command;
  });
}

function hookCommandHasMarker(command: unknown): boolean {
  return isPlainObject(command)
    && typeof (command as Record<string, unknown>).command === 'string'
    && ((command as Record<string, string>).command).includes(HOOK_MARKER);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stripJsonComments(input: string): string {
  let output = '';
  let inString = false;
  let escaped = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    const next = input[i + 1];

    if (inString) {
      output += char;
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      output += char;
      continue;
    }

    if (char === '/' && next === '/') {
      while (i < input.length && input[i] !== '\n') i++;
      output += '\n';
      continue;
    }

    if (char === '/' && next === '*') {
      i += 2;
      while (i < input.length && !(input[i] === '*' && input[i + 1] === '/')) i++;
      i++;
      continue;
    }

    output += char;
  }

  return output;
}
