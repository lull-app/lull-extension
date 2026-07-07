import * as vscode from 'vscode';
import { AdViewProvider } from './adPanel';
import { createHooksDetector } from './hooksDetector';
import { installLullHooksAndSettings, restoreClaudeSettings } from './hooksInstaller';
import { LullStatusBar } from './statusBar';
import { getOrCreateUuid, resetUuid, sendImpression } from './tracker';
import { fetchAd, nextDemoAd } from './ads';
import { currentSpinnerVerb } from './spinnerVerbs';

const HOOKS_CONSENT_KEY = 'lull.hooksConsent';

// Asks the user once before lull ever writes to ~/.claude/settings.json. The
// decision is remembered in globalState so we don't ask again. Nothing is
// written if the user declines, and nothing is written at all if lull is
// disabled via the `lull.enabled` setting.
async function ensureHooksConsent(ctx: vscode.ExtensionContext): Promise<void> {
  const consent = ctx.globalState.get<'granted' | 'declined'>(HOOKS_CONSENT_KEY);
  if (consent === 'declined') return;

  if (consent !== 'granted') {
    const choice = await vscode.window.showInformationMessage(
      'lull would like to add a small activity hook to ~/.claude/settings.json so it can tell when Claude Code is generating (used only to show/hide the sponsor card). Allow?',
      'Allow',
      'No'
    );
    if (choice !== 'Allow') {
      await ctx.globalState.update(HOOKS_CONSENT_KEY, 'declined');
      return;
    }
    await ctx.globalState.update(HOOKS_CONSENT_KEY, 'granted');
  }

  try {
    installLullHooksAndSettings(currentSpinnerVerb());
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    vscode.window.showWarningMessage(`lull: Claude settings were not updated. ${message}`);
  }
}

export async function activate(ctx: vscode.ExtensionContext): Promise<void> {
  const enabled = () => vscode.workspace.getConfiguration('lull').get<boolean>('enabled', true);

  if (enabled()) {
    await ensureHooksConsent(ctx);
  }

  // Earnings dashboard panel (sidebar)
  const provider = new AdViewProvider(ctx.extensionUri);
  ctx.subscriptions.push(
    vscode.window.registerWebviewViewProvider(AdViewProvider.viewId, provider)
  );

  // Status bar ad placement
  const statusBar = new LullStatusBar(url => {
    vscode.env.openExternal(vscode.Uri.parse(url));
  });
  ctx.subscriptions.push(statusBar);

  ctx.subscriptions.push(
    vscode.commands.registerCommand('lull.openAdUrl', () => statusBar.openCurrentUrl()),
    vscode.commands.registerCommand('lull.resetId', () => {
      resetUuid(ctx);
      vscode.window.showInformationMessage('lull: your anonymous ID has been reset.');
    }),
    vscode.commands.registerCommand('lull.restoreSettings', () => {
      try {
        restoreClaudeSettings();
        vscode.window.showInformationMessage('lull: removed lull from Claude settings.');
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        vscode.window.showWarningMessage(`lull: Claude settings were not restored. ${message}`);
      }
    }),
    vscode.commands.registerCommand('lull.simulateAd', async () => {
      const ad = nextDemoAd();
      statusBar.showAd(ad);
      provider.recordImpression(ad);
    }),
    vscode.commands.registerCommand('lull.simulateIdle', () => {
      statusBar.hideAd();
    })
  );

  const uuid = getOrCreateUuid(ctx);
  const backendUrl = () => vscode.workspace.getConfiguration('lull').get<string>('backendUrl', '');
  let combinedActive = false;
  let changeToken = 0;

  const applyActivity = async (active: boolean) => {
    if (!enabled()) return;
    if (active) {
      const token = ++changeToken;
      const url = backendUrl();
      const ad = url ? (await fetchAd(url) ?? nextDemoAd()) : nextDemoAd();
      if (token !== changeToken || !combinedActive) return;
      statusBar.showAd(ad);
      provider.recordImpression(ad);
      if (url) sendImpression(url, uuid);
    } else {
      statusBar.hideAd();
    }
  };

  const updateSource = (active: boolean) => {
    if (active === combinedActive) return;
    combinedActive = active;
    void applyActivity(active);
  };

  const hooksDetector = createHooksDetector(active => updateSource(active));

  ctx.subscriptions.push(hooksDetector);
}

export function deactivate(): void {
  try {
    restoreClaudeSettings();
  } catch {
    // Deactivation must never block VS Code shutdown.
  }
}
