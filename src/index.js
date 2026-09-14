const express    = require('express')
const cors       = require('cors')
const helmet     = require('helmet')
const rateLimit  = require('express-rate-limit')
const hpp        = require('hpp')
require('dotenv').config()

const app = express()

// ── Seguridad
app.use(helmet())
app.use(cors({
  origin: function(origin, callback) {
    // Permitir localhost y devtunnels
    if (!origin || 
        origin.includes('localhost') || 
        origin.includes('devtunnels.ms')) {
      callback(null, true)
    } else {
      callback(new Error('No permitido por CORS'))
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))
app.use(express.json({ limit: '10kb' }))
app.use(hpp())

// ── Rate limiting general
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { mensaje: 'Demasiadas peticiones, intenta más tarde' }
}))

// ── Rate limiting estricto para auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50, // cambia de 10 a 50
  message: { mensaje: 'Demasiados intentos, intenta en 15 minutos' }
})
app.use('/api/auth/login',     authLimiter)
app.use('/api/auth/registro',  authLimiter)
app.use('/api/auth/recuperar', authLimiter)

// ── Rutas
app.use('/api/auth',    require('./routes/auth'))
app.use('/api/menu',    require('./routes/menu'))
app.use('/api/pedidos', require('./routes/pedidos'))
app.use('/api/usuarios', require('./routes/usuarios'))  
app.get('/', (req, res) => res.json({ mensaje: 'API Cafetería ITLC funcionando ✅' }))

// ── Manejo de errores global
app.use((err, req, res, next) => {
  console.error('Error:', err.message)
  res.status(err.status || 500).json({
    mensaje: process.env.NODE_ENV === 'production'
      ? 'Error en el servidor'
      : err.message
  })
})

const PORT = process.env.PORT || 4000
const server = app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`)
})

server.on('error', (err) => {
  console.error('Error al iniciar servidor:', err.message)
})

process.on('uncaughtException',  (err) => {
  console.error('Error no capturado:', err.message)
})

process.on('unhandledRejection', (err) => {
  console.error('Promesa rechazada:', err.message)
})
