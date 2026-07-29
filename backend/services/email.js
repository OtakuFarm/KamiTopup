/**
 * Simple Email Receipt Service
 * Uses Nodemailer. Works with Gmail, Mailgun, Resend, etc.
 */

const nodemailer = require('nodemailer');
require('dotenv').config();

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    console.log('[Email] SMTP not configured – receipts will be logged only');
    return null;
  }

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  return transporter;
}

async function sendReceipt(order, customerEmail) {
  const transport = getTransporter();

  const html = `
    <div style="font-family: system-ui, sans-serif; max-width: 520px; margin: 0 auto; background: #0f0f13; color: #fff; border-radius: 16px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #7c3aed, #06b6d4); padding: 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">KamiTopup</h1>
        <p style="margin: 8px 0 0; opacity: 0.9;">Order Confirmation</p>
      </div>
      <div style="padding: 28px;">
        <p style="color: #a1a1aa;">Hi there,</p>
        <p>Your game top-up has been processed successfully.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 24px 0; background: #1a1a24; border-radius: 12px;">
          <tr>
            <td style="padding: 12px 16px; color: #a1a1aa;">Order ID</td>
            <td style="padding: 12px 16px; text-align: right; font-family: monospace;">${order.id}</td>
          </tr>
          <tr>
            <td style="padding: 12px 16px; color: #a1a1aa;">Game</td>
            <td style="padding: 12px 16px; text-align: right; text-transform: capitalize;">${order.game}</td>
          </tr>
          <tr>
            <td style="padding: 12px 16px; color: #a1a1aa;">Package</td>
            <td style="padding: 12px 16px; text-align: right;">${order.package_amount}</td>
          </tr>
          <tr>
            <td style="padding: 12px 16px; color: #a1a1aa;">Player ID</td>
            <td style="padding: 12px 16px; text-align: right; font-family: monospace;">${order.player_id}</td>
          </tr>
          <tr>
            <td style="padding: 12px 16px; color: #a1a1aa;">Amount Paid</td>
            <td style="padding: 12px 16px; text-align: right; font-weight: bold; color: #7c3aed;">$${Number(order.package_price).toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding: 12px 16px; color: #a1a1aa;">Status</td>
            <td style="padding: 12px 16px; text-align: right; color: #4ade80; font-weight: 600;">${order.status}</td>
          </tr>
        </table>

        <p style="color: #a1a1aa; font-size: 14px;">
          The currency should appear in your game account within a few minutes.
          If you have any issues, reply to this email or contact support with your Order ID.
        </p>
      </div>
      <div style="padding: 16px; text-align: center; color: #71717a; font-size: 12px; border-top: 1px solid #27272a;">
        © 2026 KamiTopup · Secure Game Top-Ups
      </div>
    </div>
  `;

  if (!transport) {
    console.log('[Email] Receipt preview for', customerEmail || 'no-email');
    console.log(html.slice(0, 200) + '...');
    return { sent: false, reason: 'SMTP not configured' };
  }

  try {
    await transport.sendMail({
      from: `"KamiTopup" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to: customerEmail,
      subject: `KamiTopup Order ${order.id} – ${order.package_amount}`,
      html
    });
    console.log('[Email] Receipt sent to', customerEmail);
    return { sent: true };
  } catch (err) {
    console.error('[Email] Failed:', err.message);
    return { sent: false, reason: err.message };
  }
}

module.exports = { sendReceipt };
