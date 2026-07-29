const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { rateLimit, fraudCheck } = require('../middleware/security');

router.use(rateLimit);

router.post('/', fraudCheck, orderController.createOrder);
router.get('/stats', orderController.getStats);
router.get('/lookup', orderController.lookupByEmail);
router.get('/:id', orderController.getOrder);
router.get('/', orderController.listOrders);

module.exports = router;
