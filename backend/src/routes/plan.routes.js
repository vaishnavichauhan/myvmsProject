const express = require('express');
const router = express.Router();
const SuperAdminController = require('../controllers/superadmin.controller');

// Public endpoints to list available subscription plans & details
router.get('/', SuperAdminController.getPlans);
router.get('/:id', SuperAdminController.getPlanById);

module.exports = router;
