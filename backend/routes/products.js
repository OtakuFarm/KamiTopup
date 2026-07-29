const express = require('express');
const router = express.Router();
const products = require('../services/products');

// List all games
router.get('/', (req, res) => {
  res.json({ games: products.getAllGames() });
});

// Get packages for one game (live prices later)
router.get('/:gameKey', async (req, res) => {
  const game = await products.getGamePackages(req.params.gameKey);
  if (!game) return res.status(404).json({ error: 'Game not found' });
  res.json(game);
});

module.exports = router;
