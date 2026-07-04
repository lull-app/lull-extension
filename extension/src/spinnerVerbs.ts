import { DEMO_ADS } from './ads';

export function currentSpinnerVerb(): string {
  return DEMO_ADS[0]?.ctaText ?? 'Sponsored by lull';
}
