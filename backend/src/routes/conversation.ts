import { Router } from 'express';
import { ConversationController } from '../controllers/conversationController';

const router = Router();
const conversationController = new ConversationController();

// Get conversation prompt for specific product
router.get('/prompt/:productId', conversationController.getPrompt);

// Update conversation prompt for specific product
router.put('/prompt/:productId', conversationController.updatePrompt);

// Get conversation context for active conversation
router.get('/context/:conversationId', conversationController.getContext);

// Update conversation context
router.put('/context/:conversationId', conversationController.updateContext);

export default router;
