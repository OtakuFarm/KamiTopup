/**
 * FazerCards Supplier – Official Top-up API
 * Docs: https://reseller.fazercards.com/en/docs
 *
 * Auth:  X-API-Key: fc_...
 * Order: POST /api/v2/topups/order
 * Body:  { category_id, offer_id, fields: { player_id, ... } }
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const API_KEY = process.env.FAZERCARDS_API_KEY;
const BASE_URL = process.env.FAZERCARDS_BASE_URL || 'https://api.fzr.cards/api/v2';

function createClient() {
  const headers = { 'Content-Type': 'application/json' };
  if (API_KEY) {
    headers['X-API-Key'] = API_KEY;
  }
  return axios.create({ baseURL: BASE_URL, timeout: 30000, headers });
}

/**
 * Place a top-up order
 *
 * Required on order object:
 *   - categoryId  (e.g. "cat_pubgm_1")
 *   - offerId     (e.g. "offer_60uc")
 *   - playerId
 * Optional:
 *   - serverId / extra fields
 *   - orderId (used as Idempotency-Key)
 */
async function placeTopUp(order) {
  if (!API_KEY) {
    console.log('[FazerCards] No API key – MOCK mode');
    return mockPlaceTopUp(order);
  }

  const client = createClient();

  try {
    const fields = {
      player_id: String(order.playerId)
    };

    // Add server/zone if the game needs it
    if (order.serverId) {
      fields.server_id = String(order.serverId);
      // some games use zone_id instead
      fields.zone_id = String(order.serverId);
    }

    // Merge any extra fields passed from the frontend
    if (order.fields && typeof order.fields === 'object') {
      Object.assign(fields, order.fields);
    }

    const body = {
      category_id: order.categoryId || order.category_id,
      offer_id: order.offerId || order.offer_id || order.productId || order.supplierSku,
      fields
    };

    if (!body.category_id || !body.offer_id) {
      return {
        success: false,
        message: 'Missing category_id or offer_id – map your packages to FazerCards IDs'
      };
    }

    const headers = {};
    // Idempotency – prevents double charging on retries
    headers['Idempotency-Key'] = order.orderId || order.customId || uuidv4();

    console.log('[FazerCards] Order →', {
      category_id: body.category_id,
      offer_id: body.offer_id,
      player_id: fields.player_id
    });

    const res = await client.post('/topups/order', body, { headers });
    const data = res.data || {};

    if (data.ok === false) {
      return {
        success: false,
        message: data.error || data.message || 'Order rejected by supplier'
      };
    }

    const orderData = data.order || data;
    return {
      success: true,
      supplier: 'fazercards',
      supplierOrderId: orderData.id || orderData.order_id || String(Date.now()),
      status: orderData.status || 'processing',
      raw: data
    };
  } catch (err) {
    const msg =
      err.response?.data?.error ||
      err.response?.data?.message ||
      err.message;

    console.error('[FazerCards] Failed:', msg, err.response?.status);
    return {
      success: false,
      message: typeof msg === 'string' ? msg : 'Supplier request failed'
    };
  }
}

/**
 * Validate Player ID before payment
 */
async function validatePlayerId(categoryId, playerId, extraFields = {}) {
  if (!API_KEY) return { valid: true, mock: true };

  const client = createClient();
  try {
    const res = await client.post('/topups/validate-id', {
      category_id: categoryId,
      fields: {
        player_id: String(playerId),
        ...extraFields
      }
    });

    const data = res.data || {};
    return {
      valid: data.valid === true || data.ok === true,
      playerName: data.player_name || null,
      raw: data
    };
  } catch (err) {
    console.warn('[FazerCards] validate-id:', err.message);
    return { valid: true, warning: err.message };
  }
}

/**
 * List top-up categories (games)
 */
async function getCategories(limit = 100) {
  if (!API_KEY) return [];
  const client = createClient();
  try {
    const res = await client.get('/topups', { params: { limit } });
    return res.data?.items || [];
  } catch (err) {
    console.error('[FazerCards] getCategories:', err.message);
    return [];
  }
}

/**
 * Get offers (packages) for a category
 */
async function getOffers(categoryId) {
  if (!API_KEY) return null;
  const client = createClient();
  try {
    const res = await client.get('/topups/offers', {
      params: { category_id: categoryId }
    });
    return res.data || null;
  } catch (err) {
    console.error('[FazerCards] getOffers:', err.message);
    return null;
  }
}

async function mockPlaceTopUp(order) {
  console.log('[MOCK] FazerCards', order.playerId, order.offerId || order.productId);
  await new Promise(r => setTimeout(r, 500));
  if (Math.random() > 0.05) {
    return {
      success: true,
      supplier: 'fazercards',
      supplierOrderId: 'ord-mock-' + Date.now(),
      status: 'completed'
    };
  }
  return { success: false, message: 'Mock failure' };
}

module.exports = {
  placeTopUp,
  validatePlayerId,
  getCategories,
  getOffers
};
