
/**
 * IMPORTANT – FazerCards mapping
 * Each package should eventually store:
 *   categoryId  (e.g. "cat_pubgm_1")
 *   offerId     (e.g. "offer_60uc")
 * These come from GET /topups and GET /topups/offers
 */
/**
 * Products / Live Pricing Service
 * 
 * Structure is ready for live supplier rates.
 * When you have FazerCards (or other) catalog API access,
 * uncomment and adapt the live fetch section.
 */

const axios = require('axios');
require('dotenv').config();

// Base catalog (used as fallback + structure)
const CATALOG = {
  mlbb: {
    title: 'Mobile Legends',
    subtitle: 'Diamonds',
    icon: '⚔️',
    needsServer: true,
    packages: [
      { id: 'mlbb_86', amount: '86 Diamonds', price: 1.99, original: 2.49, supplierSku: null },
      { id: 'mlbb_172', amount: '172 Diamonds', price: 3.79, original: 4.99, supplierSku: null },
      { id: 'mlbb_257', amount: '257 Diamonds', price: 5.49, original: 6.99, supplierSku: null },
      { id: 'mlbb_344', amount: '344 Diamonds', price: 7.29, original: 8.99, supplierSku: null },
      { id: 'mlbb_429', amount: '429 Diamonds', price: 8.99, original: 10.99, supplierSku: null },
      { id: 'mlbb_514', amount: '514 Diamonds', price: 10.49, original: 12.99, supplierSku: null },
      { id: 'mlbb_706', amount: '706 Diamonds', price: 14.49, original: 17.99, supplierSku: null },
      { id: 'mlbb_1412', amount: '1412 Diamonds', price: 28.99, original: 34.99, supplierSku: null },
      { id: 'mlbb_2195', amount: '2195 Diamonds', price: 44.99, original: 54.99, supplierSku: null },
      { id: 'mlbb_3688', amount: '3688 Diamonds', price: 74.99, original: 89.99, supplierSku: null },
      { id: 'mlbb_5532', amount: '5532 Diamonds', price: 109.99, original: 129.99, supplierSku: null },
      { id: 'mlbb_9288', amount: '9288 Diamonds', price: 179.99, original: 219.99, supplierSku: null }
    ]
  },
  freefire: {
    title: 'Free Fire',
    subtitle: 'Diamonds',
    icon: '🔥',
    needsServer: false,
    packages: [
      { id: 'ff_100', amount: '100 Diamonds', price: 0.99, original: 1.29, supplierSku: null },
      { id: 'ff_310', amount: '310 Diamonds', price: 2.99, original: 3.79, supplierSku: null },
      { id: 'ff_520', amount: '520 Diamonds', price: 4.99, original: 6.29, supplierSku: null },
      { id: 'ff_1060', amount: '1060 Diamonds', price: 9.99, original: 12.49, supplierSku: null },
      { id: 'ff_2180', amount: '2180 Diamonds', price: 19.99, original: 24.99, supplierSku: null },
      { id: 'ff_5600', amount: '5600 Diamonds', price: 49.99, original: 59.99, supplierSku: null }
    ]
  },
  pubg: {
    title: 'PUBG Mobile',
    subtitle: 'UC',
    icon: '🎯',
    needsServer: false,
    packages: [
      { id: 'pubg_60', amount: '60 UC', price: 0.99, original: 1.19, supplierSku: null },
      { id: 'pubg_325', amount: '325 UC', price: 4.99, original: 5.99, supplierSku: null },
      { id: 'pubg_660', amount: '660 UC', price: 9.99, original: 11.99, supplierSku: null },
      { id: 'pubg_1800', amount: '1800 UC', price: 24.99, original: 29.99, supplierSku: null },
      { id: 'pubg_3850', amount: '3850 UC', price: 49.99, original: 59.99, supplierSku: null },
      { id: 'pubg_8100', amount: '8100 UC', price: 99.99, original: 119.99, supplierSku: null }
    ]
  },
  genshin: {
    title: 'Genshin Impact',
    subtitle: 'Genesis Crystals',
    icon: '✨',
    needsServer: true,
    packages: [
      { id: 'gi_60', amount: '60 Genesis Crystals', price: 0.99, original: 1.19, supplierSku: null },
      { id: 'gi_300', amount: '300 + 30', price: 4.99, original: 5.99, supplierSku: null },
      { id: 'gi_980', amount: '980 + 110', price: 14.99, original: 17.99, supplierSku: null },
      { id: 'gi_1980', amount: '1980 + 260', price: 29.99, original: 34.99, supplierSku: null },
      { id: 'gi_3280', amount: '3280 + 600', price: 49.99, original: 59.99, supplierSku: null },
      { id: 'gi_6480', amount: '6480 + 1600', price: 99.99, original: 119.99, supplierSku: null }
    ]
  },
  valorant: {
    title: 'Valorant',
    subtitle: 'Points',
    icon: '🏹',
    needsServer: false,
    packages: [
      { id: 'val_475', amount: '475 VP', price: 4.99, original: 5.99, supplierSku: null },
      { id: 'val_1000', amount: '1000 VP', price: 9.99, original: 11.99, supplierSku: null },
      { id: 'val_2050', amount: '2050 VP', price: 19.99, original: 23.99, supplierSku: null },
      { id: 'val_3650', amount: '3650 VP', price: 34.99, original: 39.99, supplierSku: null },
      { id: 'val_5350', amount: '5350 VP', price: 49.99, original: 59.99, supplierSku: null },
      { id: 'val_11000', amount: '11000 VP', price: 99.99, original: 119.99, supplierSku: null }
    ]
  },
  roblox: {
    title: 'Roblox',
    subtitle: 'Robux',
    icon: '🧱',
    needsServer: false,
    packages: [
      { id: 'rbx_400', amount: '400 Robux', price: 4.99, original: 5.99, supplierSku: null },
      { id: 'rbx_800', amount: '800 Robux', price: 9.99, original: 11.99, supplierSku: null },
      { id: 'rbx_1700', amount: '1700 Robux', price: 19.99, original: 23.99, supplierSku: null },
      { id: 'rbx_4500', amount: '4500 Robux', price: 49.99, original: 59.99, supplierSku: null },
      { id: 'rbx_10000', amount: '10000 Robux', price: 99.99, original: 119.99, supplierSku: null }
    ]
  },
  codm: {
    title: 'Call of Duty Mobile',
    subtitle: 'CP',
    icon: '💥',
    needsServer: false,
    packages: [
      { id: 'codm_80', amount: '80 CP', price: 0.99, original: 1.19, supplierSku: null },
      { id: 'codm_400', amount: '400 CP', price: 4.99, original: 5.99, supplierSku: null },
      { id: 'codm_800', amount: '800 CP', price: 9.99, original: 11.99, supplierSku: null },
      { id: 'codm_2000', amount: '2000 CP', price: 24.99, original: 29.99, supplierSku: null },
      { id: 'codm_4000', amount: '4000 CP', price: 49.99, original: 59.99, supplierSku: null }
    ]
  },
  honkai: {
    title: 'Honkai: Star Rail',
    subtitle: 'Oneiric Shards',
    icon: '🌌',
    needsServer: true,
    packages: [
      { id: 'hsr_60', amount: '60 Oneiric Shards', price: 0.99, original: 1.19, supplierSku: null },
      { id: 'hsr_300', amount: '300 + 30', price: 4.99, original: 5.99, supplierSku: null },
      { id: 'hsr_980', amount: '980 + 110', price: 14.99, original: 17.99, supplierSku: null },
      { id: 'hsr_1980', amount: '1980 + 260', price: 29.99, original: 34.99, supplierSku: null },
      { id: 'hsr_3280', amount: '3280 + 600', price: 49.99, original: 59.99, supplierSku: null },
      { id: 'hsr_6480', amount: '6480 + 1600', price: 99.99, original: 119.99, supplierSku: null }
    ]
  },
  zenless: {
    title: 'Zenless Zone Zero',
    subtitle: 'Monochromes',
    icon: '🌃',
    needsServer: true,
    packages: [
      { id: 'zzz_60', amount: '60 Monochromes', price: 0.99, original: 1.19, supplierSku: null },
      { id: 'zzz_300', amount: '300 + 30', price: 4.99, original: 5.99, supplierSku: null },
      { id: 'zzz_980', amount: '980 + 110', price: 14.99, original: 17.99, supplierSku: null },
      { id: 'zzz_1980', amount: '1980 + 260', price: 29.99, original: 34.99, supplierSku: null },
      { id: 'zzz_3280', amount: '3280 + 600', price: 49.99, original: 59.99, supplierSku: null },
      { id: 'zzz_6480', amount: '6480 + 1600', price: 99.99, original: 119.99, supplierSku: null }
    ]
  },
  lol: {
    title: 'League of Legends',
    subtitle: 'Riot Points',
    icon: '🛡️',
    needsServer: false,
    packages: [
      { id: 'lol_575', amount: '575 RP', price: 4.99, original: 5.99, supplierSku: null },
      { id: 'lol_1380', amount: '1380 RP', price: 10.99, original: 12.99, supplierSku: null },
      { id: 'lol_2800', amount: '2800 RP', price: 21.99, original: 24.99, supplierSku: null },
      { id: 'lol_5000', amount: '5000 RP', price: 34.99, original: 39.99, supplierSku: null },
      { id: 'lol_7200', amount: '7200 RP', price: 49.99, original: 59.99, supplierSku: null }
    ]
  },
  brawl: {
    title: 'Brawl Stars',
    subtitle: 'Gems',
    icon: '⭐',
    needsServer: false,
    packages: [
      { id: 'bs_30', amount: '30 Gems', price: 1.99, original: 2.49, supplierSku: null },
      { id: 'bs_80', amount: '80 Gems', price: 4.99, original: 5.99, supplierSku: null },
      { id: 'bs_170', amount: '170 Gems', price: 9.99, original: 11.99, supplierSku: null },
      { id: 'bs_360', amount: '360 Gems', price: 19.99, original: 23.99, supplierSku: null },
      { id: 'bs_950', amount: '950 Gems', price: 49.99, original: 59.99, supplierSku: null }
    ]
  },
  clash: {
    title: 'Clash of Clans',
    subtitle: 'Gems',
    icon: '🏰',
    needsServer: false,
    packages: [
      { id: 'coc_80', amount: '80 Gems', price: 0.99, original: 1.19, supplierSku: null },
      { id: 'coc_500', amount: '500 Gems', price: 4.99, original: 5.99, supplierSku: null },
      { id: 'coc_1200', amount: '1200 Gems', price: 9.99, original: 11.99, supplierSku: null },
      { id: 'coc_2500', amount: '2500 Gems', price: 19.99, original: 23.99, supplierSku: null },
      { id: 'coc_6500', amount: '6500 Gems', price: 49.99, original: 59.99, supplierSku: null }
    ]
  }
};

// Simple in-memory cache for live prices
let priceCache = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getAllGames() {
  return Object.entries(CATALOG).map(([key, g]) => ({
    key,
    title: g.title,
    subtitle: g.subtitle,
    icon: g.icon,
    needsServer: g.needsServer
  }));
}

/**
 * Fetch live prices from supplier (structure ready)
 * Currently returns catalog prices. Uncomment real API when ready.
 */
async function fetchLivePrices(gameKey) {
  const cacheKey = gameKey;
  if (priceCache[cacheKey] && Date.now() - priceCache[cacheKey].ts < CACHE_TTL) {
    return priceCache[cacheKey].data;
  }

  const game = CATALOG[gameKey];
  if (!game) return null;

  // ========== LIVE SUPPLIER PRICE SYNC ==========
  // Uncomment and adapt when you have FazerCards / supplier catalog API:
  /*
  try {
    const res = await axios.get(
      `${process.env.FAZERCARDS_BASE_URL}/catalog/${gameKey}`, // adjust endpoint
      {
        headers: { 'X-API-Key': process.env.FAZERCARDS_API_KEY },
        timeout: 8000
      }
    );

    // Map supplier response to our package structure
    // Example mapping (adjust to real response):
    const livePackages = res.data.products.map(p => ({
      id: p.sku || p.id,
      amount: p.name || p.title,
      price: parseFloat(p.price),
      original: parseFloat(p.retail_price || p.price * 1.2),
      supplierSku: p.sku
    }));

    const result = { ...game, packages: livePackages, live: true };
    priceCache[cacheKey] = { data: result, ts: Date.now() };
    return result;
  } catch (err) {
    console.warn(`[Prices] Live fetch failed for ${gameKey}:`, err.message);
    // fall through to static catalog
  }
  */

  // Fallback: static catalog
  const result = { ...game, live: false };
  priceCache[cacheKey] = { data: result, ts: Date.now() };
  return result;
}

async function getGamePackages(gameKey) {
  return await fetchLivePrices(gameKey);
}

/**
 * Force refresh cache (useful after admin updates)
 */
function clearPriceCache() {
  priceCache = {};
}

module.exports = {
  getAllGames,
  getGamePackages,
  fetchLivePrices,
  clearPriceCache,
  CATALOG
};
