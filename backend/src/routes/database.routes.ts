import { Router } from 'express'
import { pool } from '../config/database.js'

const router = Router()

router.get('/test', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 AS result')

    res.json({
      code: 200,
      message: 'MySQL 连接成功',
      data: rows,
    })
  } catch (error) {
    console.error('MySQL 连接失败：', error)

    res.status(500).json({
      code: 500,
      message: 'MySQL 连接失败',
    })
  }
})

export default router
