/**
 * Telegram Notification Service
 * Sends you a message whenever a new order is created or fails.
 */

const axios = require('axios');
require('dotenv').config();

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function sendTelegram(message) {
  if (!TOKEN || !CHAT_ID) {
    console.log('[Telegram] Not configured – skipping notification');
    return;
  }

  try {
    await axios.post(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      chat_id: CHAT_ID,
      text: message,
      parse_mode: 'HTML',
      disable_web_page_preview: true
    });
  } catch (err) {
    console.error('[Telegram] Failed to send:', err.message);
  }
}

async function notifyNewOrder(order) {
  const msg = `
🎮 <b>New Order</b>

🆔 <code>${order.id}</code>
🎯 Game: <b>${order.game}</b>
📦 Package: ${order.package_amount}
💰 Price: $${order.package_price}
👤 Player ID: <code>${order.player_id}</code>
${order.server_id ? `🖥 Server: ${order.server_id}` : ''}
📊 Status: <b>${order.status}</b>
⏰ ${new Date().toLocaleString()}
  `.trim();

  await sendTelegram(msg);
}

async function notifyFailedOrder(order, reason) {
  const msg = `
⚠️ <b>Order Failed</b>

🆔 <code>${order.id}</code>
🎯 ${order.game} – ${order.package_amount}
👤 ${order.player_id}
❌ Reason: ${reason}
  `.trim();

  await sendTelegram(msg);
}

module.exports = {
  sendTelegram,
  notifyNewOrder,
  notifyFailedOrder
};
