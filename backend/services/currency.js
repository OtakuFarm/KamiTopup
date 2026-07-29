/**
 * Multi-currency display helper
 * Rates are approximate / static for demo.
 * In production, fetch from a free API (e.g. exchangerate.host, frankfurter.app)
 */

const RATES = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  NGN: 1600,
  GHS: 15.5,
  KES: 129,
  ZAR: 18.2,
  IDR: 16200,
  PHP: 58,
  MYR: 4.7,
  INR: 83.5,
  BRL: 5.6,
  TRY: 34.5,
  AED: 3.67
};

const SYMBOLS = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  NGN: '₦',
  GHS: 'GH₵',
  KES: 'KSh',
  ZAR: 'R',
  IDR: 'Rp',
  PHP: '₱',
  MYR: 'RM',
  INR: '₹',
  BRL: 'R$',
  TRY: '₺',
  AED: 'د.إ'
};

function convert(amountUsd, currency = 'USD') {
  const rate = RATES[currency] || 1;
  const symbol = SYMBOLS[currency] || currency + ' ';
  const value = +(amountUsd * rate).toFixed(currency === 'IDR' || currency === 'NGN' ? 0 : 2);
  return { currency, symbol, value, formatted: `${symbol}${value.toLocaleString()}` };
}

function getSupportedCurrencies() {
  return Object.keys(RATES).map(code => ({
    code,
    symbol: SYMBOLS[code],
    rate: RATES[code]
  }));
}

/**
 * Optional: refresh rates from a free API
 */
async function refreshRates() {
  try {
    const axios = require('axios');
    const res = await axios.get('https://api.frankfurter.app/latest?from=USD', { timeout: 5000 });
    if (res.data && res.data.rates) {
      Object.assign(RATES, res.data.rates);
      console.log('[Currency] Rates refreshed');
    }
  } catch (e) {
    console.warn('[Currency] Could not refresh rates:', e.message);
  }
}

module.exports = {
  convert,
  getSupportedCurrencies,
  refreshRates,
  RATES,
  SYMBOLS
};
