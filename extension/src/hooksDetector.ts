import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';

type HookState = {
  state?: unknown;
  ts?: unknown;
};

const ACTIVITY_FILE = path.join(os.homedir(), '.lull', 'activity.json');
const POLL_MS = 500;
const ACTIVE_WINDOW_MS = 15000;

export function createHooksDetector(onChange: (active: boolean) => void): vscode.Disposable {
  let active = false;

  function set(next: boolean): void {
    if (next === active) return;
    active = next;
    onChange(next);
  }

  function poll(): void {
    try {
      if (!fs.existsSync(ACTIVITY_FILE)) {
        set(false);
        return;
      }

      const activity = JSON.parse(fs.readFileSync(ACTIVITY_FILE, 'utf8')) as HookState;
      const state = activity.state;
      const ts = typeof activity.ts === 'number' ? activity.ts : 0;
      const fresh = Date.now() - ts * 1000 <= ACTIVE_WINDOW_MS;

      set((state === 'start' || state === 'tool') && fresh);
    } catch {
      set(false);
    }
  }

  poll();
  const interval = setInterval(poll, POLL_MS);
  return new vscode.Disposable(() => clearInterval(interval));
}
