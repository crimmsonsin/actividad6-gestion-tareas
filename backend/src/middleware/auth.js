const jwt = require('jsonwebtoken')

function authenticateToken(req, res, next) {
  const authorization = req.headers.authorization
  const token = authorization?.startsWith('Bearer ')
    ? authorization.slice(7)
    : null

  if (!token) {
    return res.status(401).json({ message: 'Token de autenticación requerido.' })
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET)
    next()
  } catch {
    res.status(401).json({ message: 'Token inválido o expirado.' })
  }
}

module.exports = authenticateToken
