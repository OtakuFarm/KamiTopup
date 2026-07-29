const express = require('express');
const router = express.Router();
const currency = require('../services/currency');

router.get('/', (req, res) => {
  res.json({ currencies: currency.getSupportedCurrencies() });
});

router.get('/convert', (req, res) => {
  const amount = parseFloat(req.query.amount || 0);
  const to = (req.query.to || 'USD').toUpperCase();
  res.json(currency.convert(amount, to));
});

module.exports = router;
