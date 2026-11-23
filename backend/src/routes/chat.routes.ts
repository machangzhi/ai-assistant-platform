import { Router } from 'express';
import { chat, streamChat } from '../controllers/chat.controller.js';

const router = Router();

router.post('/', chat);
router.post('/stream', streamChat);

export default router;