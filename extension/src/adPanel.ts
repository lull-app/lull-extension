import * as vscode from 'vscode';
import { Ad } from './ads';

export class AdViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewId = 'lull.adView';
  private _view?: vscode.WebviewView;
  private _impressions = 0;
  private _earnings = 0;
  private _sessionStart = Date.now();

  constructor(private readonly _extensionUri: vscode.Uri) {}

  resolveWebviewView(view: vscode.WebviewView): void {
    this._view = view;
    view.webview.options = { enableScripts: false, localResourceRoots: [] };
    this._render();
  }

  recordImpression(_ad: Ad): void {
    this._impressions++;
    this._earnings += 0.015;
    this._render();
  }

  private _render(): void {
    if (!this._view) return;
    this._view.webview.html = this._html();
  }

  private _html(): string {
    const e = this._earnings.toFixed(3);
    const imp = this._impressions;
    const activeMin = Math.floor((Date.now() - this._sessionStart) / 60000);
    const pct = Math.min((this._earnings / 20) * 100, 100).toFixed(1);
    return `<!DOCTYPE html><html><head>
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0d0d10;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;padding:12px;color:#e2e2e2;-webkit-font-smoothing:antialiased}
.card{background:#111114;border:1px solid #1a1a1f;border-radius:12px;padding:12px 14px;margin-bottom:10px}
.top{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
.amount{font-size:22px;font-weight:700;color:#c9a96e;letter-spacing:-.5px;font-variant-numeric:tabular-nums}
.dot{width:7px;height:7px;border-radius:50%;background:#c9a96e;animation:pulse 2.5s ease-in-out infinite}
@keyframes pulse{0%,100%{opacity:.25;transform:scale(1)}50%{opacity:.8;transform:scale(1.15)}}
.row{display:flex;gap:8px}
.stat{flex:1;background:#0d0d10;border:1px solid #1a1a1f;border-radius:8px;padding:7px 9px}
.stat-n{font-size:13px;font-weight:600;color:#ccc}
.stat-l{font-size:9px;color:#444;margin-top:2px;text-transform:uppercase;letter-spacing:.5px}
.session-label{font-size:9.5px;color:#333;text-transform:uppercase;letter-spacing:.6px;margin-bottom:6px}
.payout-bar{background:#111;border:1px solid #1a1a1f;border-radius:6px;overflow:hidden;height:6px;margin-top:8px}
.payout-fill{height:100%;background:linear-gradient(90deg,#c9a96e,#e8c07a);border-radius:6px;transition:width .4s}
.payout-label{display:flex;justify-content:space-between;font-size:9px;color:#444;margin-top:4px}
.hint{font-size:9.5px;color:#2a2a2f;text-align:center;margin-top:8px}
</style></head><body>
<div class="card">
  <div class="top">
    <div class="amount">$${e}</div>
    <div class="dot"></div>
  </div>
  <div class="row">
    <div class="stat"><div class="stat-n">${imp}</div><div class="stat-l">Impressions</div></div>
    <div class="stat"><div class="stat-n">$${(imp*0.015).toFixed(2)}</div><div class="stat-l">Earned</div></div>
    <div class="stat"><div class="stat-n">${activeMin}m</div><div class="stat-l">Active</div></div>
  </div>
</div>
<div class="card">
  <div class="session-label">Payout · USDC / Stripe</div>
  <div style="display:flex;justify-content:space-between;align-items:center">
    <span style="font-size:11px;color:#555">$${e}</span>
    <span style="font-size:11px;color:#555">$20.00</span>
  </div>
  <div class="payout-bar"><div class="payout-fill" style="width:${pct}%"></div></div>
  <div class="payout-label"><span>${pct}%</span><span>min. payout</span></div>
</div>
<div class="hint">Ads appear in your status bar ↓</div>
</body></html>`;
  }
}
