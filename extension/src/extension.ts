import * as vscode from 'vscode';
import { AdViewProvider } from './adPanel';
import { createDetector } from './detector';
import { createHooksDetector } from './hooksDetector';
import { installLullHooksAndSettings, restoreClaudeSettings } from './hooksInstaller';
import { LullStatusBar } from './statusBar';
import { getOrCreateUuid, resetUuid, sendImpression } from './tracker';
import { fetchAd, nextDemoAd } from './ads';
import { currentSpinnerVerb } from './spinnerVerbs';

export async function activate(ctx: vscode.ExtensionContext): Promise<void> {
  try {
    installLullHooksAndSettings(currentSpinnerVerb());
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    vscode.window.showWarningMessage(`lull: Claude settings were not updated. ${message}`);
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
  const enabled = () => vscode.workspace.getConfiguration('lull').get<boolean>('enabled', true);
  const sourceActive = { hooks: false, terminal: false };
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

  const updateSource = (source: keyof typeof sourceActive, active: boolean) => {
    sourceActive[source] = active;
    const nextCombined = sourceActive.hooks || sourceActive.terminal;
    if (nextCombined === combinedActive) return;
    combinedActive = nextCombined;
    void applyActivity(nextCombined);
  };

  const hooksDetector = createHooksDetector(active => updateSource('hooks', active));
  const detector = createDetector(active => updateSource('terminal', active));

  ctx.subscriptions.push(hooksDetector);
  ctx.subscriptions.push(detector);
}

export function deactivate(): void {
  try {
    restoreClaudeSettings();
  } catch {
    // Deactivation must never block VS Code shutdown.
  }
}
