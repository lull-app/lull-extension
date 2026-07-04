import * as vscode from 'vscode';
import * as crypto from 'crypto';

const UUID_KEY = 'lull.uuid';

export function getOrCreateUuid(ctx: vscode.ExtensionContext): string {
  let uuid = ctx.globalState.get<string>(UUID_KEY);
  if (!uuid) {
    uuid = crypto.randomUUID();
    ctx.globalState.update(UUID_KEY, uuid);
  }
  return uuid;
}

export function resetUuid(ctx: vscode.ExtensionContext): string {
  const uuid = crypto.randomUUID();
  ctx.globalState.update(UUID_KEY, uuid);
  return uuid;
}

export async function sendImpression(backendUrl: string, uuid: string): Promise<void> {
  try {
    await fetch(`${backendUrl}/impression`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uuid, timestamp: Date.now(), window_focused: vscode.window.state.focused }),
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    // silent fail
  }
}
