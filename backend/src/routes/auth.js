const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const pool = require('../db')

const router = express.Router()

function createToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: '2h' },
  )
}

router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password } = req.body

    if (!name?.trim() || !email?.trim() || !password || password.length < 6) {
      return res.status(400).json({
        message: 'Nombre, correo y una contraseña de mínimo 6 caracteres son obligatorios.',
      })
    }

    const [existingUsers] = await pool.query(
      'SELECT id FROM users WHERE email = ? LIMIT 1',
      [email.trim().toLowerCase()],
    )

    if (existingUsers.length) {
      return res.status(409).json({ message: 'El correo ya está registrado.' })
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
      [name.trim(), email.trim().toLowerCase(), passwordHash],
    )
    const user = { id: result.insertId, name: name.trim(), email: email.trim().toLowerCase() }

    res.status(201).json({ user, token: createToken(user) })
  } catch (error) {
    next(error)
  }
})

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body
    const [users] = await pool.query(
      'SELECT id, name, email, password_hash FROM users WHERE email = ? LIMIT 1',
      [email?.trim().toLowerCase()],
    )
    const user = users[0]

    if (!user || !(await bcrypt.compare(password || '', user.password_hash))) {
      return res.status(401).json({ message: 'Correo o contraseña incorrectos.' })
    }

    const publicUser = { id: user.id, name: user.name, email: user.email }
    res.json({ user: publicUser, token: createToken(publicUser) })
  } catch (error) {
    next(error)
  }
})

module.exports = router
