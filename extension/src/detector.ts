import * as vscode from 'vscode';

export type OnStateChange = (active: boolean) => void;

// Braille spinner chars Claude Code uses + common "generating" signals
const GENERATING = /[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏]|esc to interrupt|thinking|working|generating/i;
// Shell/REPL prompt = generation done
const IDLE = /[\$>#❯]\s*$/m;

export function createDetector(onChange: OnStateChange): vscode.Disposable {
  let active = false;
  let idleTimer: NodeJS.Timeout | undefined;

  function set(next: boolean) {
    if (next === active) return;
    active = next;
    onChange(next);
  }

  const disposables: vscode.Disposable[] = [
    vscode.window.onDidWriteTerminalData(e => {
      const t = e.data;
      if (GENERATING.test(t)) {
        if (idleTimer) { clearTimeout(idleTimer); idleTimer = undefined; }
        set(true);
      } else if (active && IDLE.test(t)) {
        if (idleTimer) clearTimeout(idleTimer);
        idleTimer = setTimeout(() => set(false), 600);
      }
    }),
    vscode.window.onDidCloseTerminal(() => {
      if (vscode.window.terminals.length === 0) set(false);
    }),
    { dispose: () => { if (idleTimer) clearTimeout(idleTimer); } },
  ];

  return vscode.Disposable.from(...disposables);
}
