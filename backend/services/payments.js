/**
 * Multi-Gateway Payment Router
 *
 * Strategy:
 * - Auto-detect country (IP) + manual override
 * - Return the 2 best gateways for that country
 * - Primary gateways: Paystack (Africa) + Paddle (Worldwide)
 * - Fallback: Flutterwave
 */

const GATEWAYS = {
  paystack: {
    id: 'paystack',
    name: 'Paystack',
    label: 'Card / Bank / USSD',
    description: 'Best for Nigeria & Africa',
    icon: '💳',
    regions: ['NG', 'GH', 'KE', 'ZA', 'CI', 'EG']
  },
  flutterwave: {
    id: 'flutterwave',
    name: 'Flutterwave',
    label: 'Card / Mobile Money',
    description: 'Works across Africa',
    icon: '🌍',
    regions: ['NG', 'GH', 'KE', 'ZA', 'UG', 'TZ', 'RW', 'ZM', 'MW', 'SN', 'CM']
  },
  paddle: {
    id: 'paddle',
    name: 'Paddle',
    label: 'International Card',
    description: 'Best worldwide (US, EU, UK, Asia…)',
    icon: '🌐',
    regions: ['*'] // global
  }
};

// Country → ordered list of preferred gateways (max 2 shown to user)
const COUNTRY_ROUTES = {
  // West & major Africa → Paystack first
  NG: ['paystack', 'paddle'],
  GH: ['paystack', 'paddle'],
  KE: ['paystack', 'flutterwave'],
  ZA: ['paystack', 'paddle'],

  // Other Africa → Flutterwave first
  UG: ['flutterwave', 'paddle'],
  TZ: ['flutterwave', 'paddle'],
  RW: ['flutterwave', 'paddle'],
  SN: ['flutterwave', 'paddle'],
  CM: ['flutterwave', 'paddle'],
  CI: ['flutterwave', 'paystack'],
  EG: ['flutterwave', 'paddle'],

  // High-value worldwide → Paddle primary
  US: ['paddle', 'paystack'],
  GB: ['paddle', 'paystack'],
  CA: ['paddle', 'paystack'],
  AU: ['paddle', 'paystack'],
  DE: ['paddle', 'paystack'],
  FR: ['paddle', 'paystack'],
  NL: ['paddle', 'paystack'],
  SE: ['paddle', 'paystack'],
  NO: ['paddle', 'paystack'],
  SG: ['paddle', 'paystack'],
  MY: ['paddle', 'paystack'],
  PH: ['paddle', 'paystack'],
  ID: ['paddle', 'paystack'],
  IN: ['paddle', 'paystack'],
  AE: ['paddle', 'paystack'],
  SA: ['paddle', 'paystack'],
  BR: ['paddle', 'paystack'],
  MX: ['paddle', 'paystack'],
  JP: ['paddle', 'paystack'],
  KR: ['paddle', 'paystack'],
  TR: ['paddle', 'paystack'],

  // Default for any other country
  DEFAULT: ['paddle', 'paystack']
};

const COUNTRY_NAMES = {
  NG: 'Nigeria', GH: 'Ghana', KE: 'Kenya', ZA: 'South Africa',
  UG: 'Uganda', TZ: 'Tanzania', RW: 'Rwanda', SN: 'Senegal',
  CM: 'Cameroon', CI: 'Ivory Coast', EG: 'Egypt',
  US: 'United States', GB: 'United Kingdom', CA: 'Canada', AU: 'Australia',
  DE: 'Germany', FR: 'France', NL: 'Netherlands', SE: 'Sweden', NO: 'Norway',
  SG: 'Singapore', MY: 'Malaysia', PH: 'Philippines', ID: 'Indonesia',
  IN: 'India', AE: 'United Arab Emirates', SA: 'Saudi Arabia',
  BR: 'Brazil', MX: 'Mexico', JP: 'Japan', KR: 'South Korea', TR: 'Turkey'
};

/**
 * Get the 2 best payment options for a country
 */
function getPaymentOptions(countryCode) {
  const code = (countryCode || 'DEFAULT').toUpperCase();
  const route = COUNTRY_ROUTES[code] || COUNTRY_ROUTES.DEFAULT;

  return route.slice(0, 2).map(id => ({
    ...GATEWAYS[id],
    recommended: id === route[0]
  }));
}

/**
 * List countries for the dropdown
 */
function getCountryList() {
  const codes = Object.keys(COUNTRY_ROUTES).filter(c => c !== 'DEFAULT');
  return codes.map(code => ({
    code,
    name: COUNTRY_NAMES[code] || code
  })).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Simple IP → country helper (placeholder)
 * In production use Cloudflare CF-IPCountry header or a GeoIP service
 */
function detectCountryFromRequest(req) {
  // Cloudflare
  const cf = req.headers['cf-ipcountry'];
  if (cf && cf !== 'XX') return cf.toUpperCase();

  // Vercel / other
  const vercel = req.headers['x-vercel-ip-country'];
  if (vercel) return vercel.toUpperCase();

  // Fallback
  return 'NG'; // default while testing from Nigeria
}

module.exports = {
  getPaymentOptions,
  getCountryList,
  detectCountryFromRequest,
  GATEWAYS,
  COUNTRY_ROUTES
};
