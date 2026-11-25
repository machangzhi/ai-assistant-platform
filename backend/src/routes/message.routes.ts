import { Router } from 'express'
import * as messageController from '../controllers/message.controller'

const router = Router()

router.post('/:id/messages', messageController.create)

router.get('/:id/messages', messageController.list)

router.delete('/:id/messages', messageController.clear)

export default router
