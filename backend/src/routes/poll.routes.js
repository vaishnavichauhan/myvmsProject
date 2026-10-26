const { Router } = require('express');
const PollController = require('../controllers/poll.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { requireFeature } = require('../middlewares/entitlement.middleware');

const router = Router();

// Authentication and POLLS module required for all endpoints
router.use(authMiddleware, requireFeature('POLLS'));

// Statistics overview
router.get('/stats', PollController.getStats);

// List & Create
router.get('/', PollController.getAllPolls);
router.post('/', PollController.createPoll);

// Single poll & actions
router.get('/:id', PollController.getPollById);
router.post('/:id/vote', PollController.castVote);
router.patch('/:id/close', PollController.closePoll);
router.delete('/:id', PollController.deletePoll);

module.exports = router;
