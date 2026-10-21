const { Router } = require('express');
const HealthController = require('../controllers/health.controller');

const router = Router();

router.get('/', HealthController.check);

module.exports = router;
