import * as vscode from 'vscode';
import { Ad } from './ads';

export class LullStatusBar {
  private readonly _item: vscode.StatusBarItem;
  private _currentUrl = '';

  constructor(private readonly _openUrl: (url: string) => void) {
    this._item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 1000);
    this._item.command = 'lull.openAdUrl';
  }

  showAd(ad: Ad): void {
    this._currentUrl = /^https?:\/\//i.test(ad.ctaUrl) ? ad.ctaUrl : '';
    this._item.text = `$(loading~spin) ${ad.logo} ${ad.name}  ·  ${ad.ctaText}`;
    this._item.tooltip = `${ad.tagline}\n\nClick to visit → ${ad.ctaUrl}\n\nPowered by lull`;
    this._item.color = ad.color === '#ffffff' ? '#c9a96e' : ad.color;
    this._item.show();
  }

  hideAd(): void {
    this._item.hide();
    this._currentUrl = '';
  }

  openCurrentUrl(): void {
    if (!this._currentUrl) return;
    const u = vscode.Uri.parse(this._currentUrl, true);
    if (u.scheme !== 'http' && u.scheme !== 'https') return;
    this._openUrl(this._currentUrl);
  }

  dispose(): void {
    this._item.dispose();
  }
}
