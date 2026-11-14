const express = require('express')
const pool = require('../db')
const authenticateToken = require('../middleware/auth')

const router = express.Router()
router.use(authenticateToken)

const allowedPriorities = ['low', 'medium', 'high']
const allowedStatuses = ['pending', 'in-progress', 'completed']

function validateTaskInput(body) {
  const { title, priority = 'medium', status = 'pending' } = body
  if (!title?.trim() || !allowedPriorities.includes(priority) || !allowedStatuses.includes(status)) {
    return 'Título, prioridad y estado válidos son obligatorios.'
  }
  return null
}

router.get('/', async (req, res, next) => {
  try {
    const { search = '', status, priority } = req.query
    const conditions = ['user_id = ?']
    const values = [req.user.id]

    if (search.trim()) {
      conditions.push('(title LIKE ? OR description LIKE ?)')
      values.push(`%${search.trim()}%`, `%${search.trim()}%`)
    }
    if (status && allowedStatuses.includes(status)) {
      conditions.push('status = ?')
      values.push(status)
    }
    if (priority && allowedPriorities.includes(priority)) {
      conditions.push('priority = ?')
      values.push(priority)
    }

    const [tasks] = await pool.query(
      `SELECT id, title, description, due_date AS dueDate, priority, status, created_at AS createdAt, updated_at AS updatedAt
       FROM tasks WHERE ${conditions.join(' AND ')} ORDER BY due_date IS NULL, due_date ASC, created_at DESC`,
      values,
    )
    res.json(tasks)
  } catch (error) {
    next(error)
  }
})

router.post('/', async (req, res, next) => {
  try {
    const validationError = validateTaskInput(req.body)
    if (validationError) return res.status(400).json({ message: validationError })

    const { title, description = '', dueDate = null, priority = 'medium', status = 'pending' } = req.body
    const [result] = await pool.query(
      'INSERT INTO tasks (user_id, title, description, due_date, priority, status) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.id, title.trim(), description.trim(), dueDate || null, priority, status],
    )
    const [tasks] = await pool.query(
      'SELECT id, title, description, due_date AS dueDate, priority, status, created_at AS createdAt, updated_at AS updatedAt FROM tasks WHERE id = ? AND user_id = ?',
      [result.insertId, req.user.id],
    )
    res.status(201).json(tasks[0])
  } catch (error) {
    next(error)
  }
})

router.put('/:id', async (req, res, next) => {
  try {
    const validationError = validateTaskInput(req.body)
    if (validationError) return res.status(400).json({ message: validationError })

    const { title, description = '', dueDate = null, priority = 'medium', status = 'pending' } = req.body
    const [result] = await pool.query(
      'UPDATE tasks SET title = ?, description = ?, due_date = ?, priority = ?, status = ? WHERE id = ? AND user_id = ?',
      [title.trim(), description.trim(), dueDate || null, priority, status, req.params.id, req.user.id],
    )

    if (!result.affectedRows) return res.status(404).json({ message: 'Tarea no encontrada.' })
    const [tasks] = await pool.query(
      'SELECT id, title, description, due_date AS dueDate, priority, status, created_at AS createdAt, updated_at AS updatedAt FROM tasks WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id],
    )
    res.json(tasks[0])
  } catch (error) {
    next(error)
  }
})

router.patch('/:id/status', async (req, res, next) => {
  try {
    if (!allowedStatuses.includes(req.body.status)) {
      return res.status(400).json({ message: 'Estado inválido.' })
    }
    const [result] = await pool.query(
      'UPDATE tasks SET status = ? WHERE id = ? AND user_id = ?',
      [req.body.status, req.params.id, req.user.id],
    )
    if (!result.affectedRows) return res.status(404).json({ message: 'Tarea no encontrada.' })
    res.json({ message: 'Estado actualizado.' })
  } catch (error) {
    next(error)
  }
})

router.delete('/:id', async (req, res, next) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM tasks WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id],
    )
    if (!result.affectedRows) return res.status(404).json({ message: 'Tarea no encontrada.' })
    res.status(204).send()
  } catch (error) {
    next(error)
  }
})

module.exports = router
