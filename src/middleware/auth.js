// =====================================================================
//  middleware/auth.js — Paradigma Funcional aplicado
//  Cafetería 2 ITLC — Módulo de Inicio de Sesión
// =====================================================================

const jwt = require('jsonwebtoken')
require('dotenv').config()

// ── [1] FUNCIONES PURAS
//    Extraen información del token sin efectos secundarios

const extraerTokenDeHeader = (authHeader) =>
  authHeader && authHeader.split(' ')[1]

const esAdmin = (usuario) => usuario.id_rol === 1

// ── [2] FUNCIONES DE ORDEN SUPERIOR (Higher-Order Functions)
//    verificarToken y soloAdmin reciben funciones (next) como argumento
//    y las ejecutan cuando la validación pasa — eso es un callback

// ── [3] CALLBACKS
//    'next' es un callback que Express pasa al middleware.
//    Se llama cuando la validación es exitosa para pasar al siguiente handler.

const verificarToken = (req, res, next) => {
  // [4] Desestructuración del header de autorización
  const { authorization: authHeader } = req.headers

  // [1] Función pura para extraer el token
  const token = extraerTokenDeHeader(authHeader)

  if (!token) {
    return res.status(401).json({ mensaje: 'Acceso no autorizado' })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'cafeteria-itlc'
    })

    // [5] Inmutabilidad: no mutamos req directamente más de lo necesario,
    //    asignamos solo la propiedad nueva
    req.usuario = { ...decoded }

    // [3] Llamamos al callback next() para continuar con el flujo
    next()
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ mensaje: 'Sesión expirada, inicia sesión nuevamente' })
    }
    return res.status(403).json({ mensaje: 'Token inválido' })
  }
}

// ── [6] COMPOSICIÓN DE FUNCIONES
//    soloAdmin compone sobre verificarToken — solo se ejecuta si el token pasó.
//    crearMiddlewareRol es una función de orden superior que genera middlewares
//    basados en una condición (función pura de validación de rol).

const crearMiddlewareRol = (condicionFn, mensajeError) => (req, res, next) => {
  // [1] Usa función pura para evaluar el rol
  if (!condicionFn(req.usuario)) {
    return res.status(403).json({ mensaje: mensajeError })
  }
  // [3] Callback next() si la condición pasa
  next()
}

// Generamos soloAdmin usando la HOF crearMiddlewareRol + función pura esAdmin
const soloAdmin = crearMiddlewareRol(esAdmin, 'Acceso denegado')

module.exports = {
  verificarToken,
  soloAdmin,
  // Exportamos utilidades funcionales para testing o reutilización
  extraerTokenDeHeader,
  esAdmin,
  crearMiddlewareRol,
}
