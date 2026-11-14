require('dotenv').config()

const express = require('express')
const cors = require('cors')
const pool = require('./db')
const authRoutes = require('./routes/auth')
const taskRoutes = require('./routes/tasks')

const app = express()
const port = Number(process.env.PORT || 3000)

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }))
app.use(express.json())

app.get('/api/health', async (_req, res, next) => {
  try {
    await pool.query('SELECT 1')
    res.json({ status: 'ok', database: 'connected' })
  } catch (error) {
    next(error)
  }
})

app.use('/api/auth', authRoutes)
app.use('/api/tasks', taskRoutes)

app.use((error, _req, res, _next) => {
  console.error(error)
  res.status(500).json({ message: 'Ocurrió un error interno en el servidor.' })
})

app.listen(port, () => {
  console.log(`Backend escuchando en http://localhost:${port}`)
})
