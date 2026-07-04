export interface Ad {
  name: string;
  logo: string;
  color: string;
  tagline: string;
  ctaText: string;
  ctaUrl: string;
}

export const DEMO_ADS: Ad[] = [
  { name: 'Vercel',  logo: '▲', color: '#c9a96e', tagline: 'Ship frontend apps with zero config. From git push to live URL.', ctaText: 'Deploy free →', ctaUrl: 'https://vercel.com' },
  { name: 'Railway', logo: '🚂', color: '#b835ff', tagline: 'Deploy any project in seconds. No DevOps required.',            ctaText: 'Start now →',   ctaUrl: 'https://railway.app' },
  { name: 'Clerk',   logo: '⚡', color: '#6c47ff', tagline: 'Auth that just works. Add login to your app in minutes.',        ctaText: 'Try free →',    ctaUrl: 'https://clerk.com' },
  { name: 'Resend',  logo: '✉',  color: '#f97316', tagline: 'The email API devs actually love. Ship transactional email fast.', ctaText: 'Get started →', ctaUrl: 'https://resend.com' },
  { name: 'Linear',  logo: 'L',  color: '#5e6ad2', tagline: 'Issue tracking built for high-performance teams.',               ctaText: 'See Linear →',  ctaUrl: 'https://linear.app' },
];

let demoIndex = 0;

export function nextDemoAd(): Ad {
  const ad = DEMO_ADS[demoIndex % DEMO_ADS.length];
  demoIndex++;
  return ad;
}

export async function fetchAd(backendUrl: string): Promise<Ad | null> {
  try {
    const res = await fetch(`${backendUrl}/ad`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;
    return await res.json() as Ad;
  } catch {
    return null;
  }
}
