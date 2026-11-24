import { Router } from 'express'

import {
  listUsers,
  detailUser,
  addUser,
  editUser,
  removeUser,
} from '../controllers/user.controller.js'

import { validateBody } from '../middlewares/validate.middleware.js'

import { createUserSchema, updateUserSchema } from '../validators/user.schema.js'

const router = Router()

router.get('/', listUsers)
router.get('/:id', detailUser)

router.post('/', validateBody(createUserSchema), addUser)

router.put('/:id', validateBody(updateUserSchema), editUser)

router.delete('/:id', removeUser)

export default router
