// =====================================================================
//  authController.js — Paradigma Funcional aplicado
//  Cafetería 2 ITLC — Módulo de Inicio de Sesión
// =====================================================================

const pool    = require('../db')
const bcrypt  = require('bcryptjs')
const jwt     = require('jsonwebtoken') 
const twilio  = require('twilio')
const { body, validationResult } = require('express-validator')
require('dotenv').config()

// ── [1] FUNCIONES PURAS (Pure Functions)
//    Su resultado depende SOLO de sus parámetros. No modifican nada externo.

const esTelefonoValido = (telefono) =>
  typeof telefono === 'string' && /^[0-9]{10}$/.test(telefono)

const esPasswordValida = (contrasena) =>
  typeof contrasena === 'string' &&
  contrasena.length >= 8 &&
  /(?=.*[a-zA-Z])(?=.*[0-9])/.test(contrasena)

const calcularIntentosRestantes = (intentosActuales) =>
  5 - (intentosActuales + 1)

const crearPayloadToken = (usuario) => ({
  id_usuario: usuario.id_usuario,
  id_rol:     usuario.id_rol,
  rol:        usuario.rol,
})

// ── [2] INMUTABILIDAD
//    En lugar de modificar el objeto usuario, creamos una copia con {...}

const construirRespuestaUsuario = (usuario) => ({
  ...{},                          // copia vacía base
  id_usuario: usuario.id_usuario,
  nombre:     usuario.nombre,
  apellido:   usuario.apellido,
  telefono:   usuario.telefono,
  rol:        usuario.rol,
})

// ── [3] FUNCIONES DE ORDEN SUPERIOR (Higher-Order Functions)
//    Función que recibe otra función (validador) y devuelve una nueva función

const conValidacion = (validador) => async (req, res) => {
  const errores = validationResult(req)
  if (!errores.isEmpty()) {
    return res.status(400).json({ mensaje: errores.array()[0].msg })
  }
  return validador(req, res)
}

// Función de orden superior: recibe un callback y lo envuelve en try/catch
const conManejadorDeErrores = (handler) => async (req, res) => {
  try {
    await handler(req, res)
  } catch (err) {
    console.error('Error en controlador:', err.message)
    res.status(500).json({ mensaje: 'Error en el servidor' })
  }
}

// ── [4] FUNCIONES ANÓNIMAS Y ARROW FUNCTIONS (Lambda)
//    Usadas como callbacks en validadores y manejadores

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

// ── [5] VALIDADORES — expresiones lambda como callbacks de express-validator

const validarRegistro = [
  body('nombre')
    .trim()
    .notEmpty().withMessage('El nombre es requerido')
    .isLength({ min: 2, max: 50 }).withMessage('El nombre debe tener entre 2 y 50 caracteres')
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/).withMessage('El nombre solo puede contener letras'),
  body('apellido')
    .trim()
    .notEmpty().withMessage('El apellido es requerido')
    .isLength({ min: 2, max: 50 }).withMessage('El apellido debe tener entre 2 y 50 caracteres')
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/).withMessage('El apellido solo puede contener letras'),
  body('telefono')
    .trim()
    .notEmpty().withMessage('El teléfono es requerido')
    .matches(/^[0-9]{10}$/).withMessage('El teléfono debe tener exactamente 10 dígitos'),
  body('contrasena')
    .notEmpty().withMessage('La contraseña es requerida')
    .isLength({ min: 8 }).withMessage('La contraseña debe tener mínimo 8 caracteres')
    .matches(/^(?=.*[a-zA-Z])(?=.*[0-9])/).withMessage('La contraseña debe tener letras y números'),
]

const validarLogin = [
  body('telefono')
    .trim()
    .notEmpty().withMessage('El teléfono es requerido')
    .matches(/^[0-9]{10}$/).withMessage('Teléfono inválido'),
  body('contrasena')
    .notEmpty().withMessage('La contraseña es requerida'),
]

// ── [6] CALLBACKS — Los manejadores de rutas actúan como callbacks
//    Express ejecuta estas funciones cuando llega una petición

// ── R EGISTRO
const _registroLogica = async (req, res) => {
  // [2] Desestructuración — extrae valores del objeto req.body de forma declarativa
  const { nombre, apellido, telefono, contrasena } = req.body

  const [existe] = await pool.query(
    'SELECT id_usuario FROM usuarios WHERE telefono = ?', [telefono]
  )
  if (existe.length > 0) {
    return res.status(400).json({ mensaje: 'El número de teléfono ya está registrado' })
  }

  const hash = await bcrypt.hash(contrasena, 12)
  await pool.query(
    'INSERT INTO usuarios (nombre, apellido, telefono, contrasena, id_rol, intentos_fallidos) VALUES (?,?,?,?,2,0)',
    [nombre, apellido, telefono, hash]
  )

  res.status(201).json({ mensaje: 'Usuario registrado exitosamente' })
}

// [3] Composición: conManejadorDeErrores envuelve conValidacion que envuelve la lógica
const registro = conManejadorDeErrores(conValidacion(_registroLogica))

// ── LOGIN
const _loginLogica = async (req, res) => {
  // [2] Desestructuración
  const { telefono, contrasena } = req.body

  const [rows] = await pool.query(
    `SELECT u.*, r.nombre as rol
     FROM usuarios u
     JOIN roles r ON u.id_rol = r.id_rol
     WHERE u.telefono = ?`,
    [telefono]
  )

  const hashFalso = '$2b$12$invalidhashtopreventtimingattacks12345678901234'
  const hashReal  = rows.length > 0 ? rows[0].contrasena : hashFalso

  if (rows.length > 0 && rows[0].intentos_fallidos >= 5) {
    return res.status(403).json({
      mensaje: 'Cuenta bloqueada por demasiados intentos fallidos. Contacta al administrador.'
    })
  }

  if (rows.length > 0 && rows[0].activo === 0) {
    return res.status(403).json({ mensaje: 'Cuenta inactiva. Contacta al administrador.' })
  }

  const valida = await bcrypt.compare(contrasena, hashReal)

  if (rows.length === 0 || !valida) {
    if (rows.length > 0) {
      await pool.query(
        'UPDATE usuarios SET intentos_fallidos = intentos_fallidos + 1 WHERE telefono = ?',
        [telefono]
      )

      // [1] Función pura para calcular intentos restantes
      const intentosRestantes = calcularIntentosRestantes(rows[0].intentos_fallidos)

      if (intentosRestantes <= 0) {
        return res.status(403).json({
          mensaje: 'Cuenta bloqueada por demasiados intentos fallidos. Contacta al administrador.'
        })
      }
      return res.status(401).json({
        mensaje: `Teléfono o contraseña incorrectos. Intentos restantes: ${intentosRestantes}`
      })
    }
    return res.status(401).json({ mensaje: 'Teléfono o contraseña incorrectos' })
  }

  await pool.query(
    'UPDATE usuarios SET intentos_fallidos = 0 WHERE telefono = ?',
    [telefono]
  )

  const usuario = rows[0]

  // [1] Función pura para crear el payload del token
  const payload = crearPayloadToken(usuario)

  const token = jwt.sign(
    payload,
    process.env.JWT_SECRET,
    { expiresIn: '8h', issuer: 'cafeteria-itlc' }
  )

  // [2] Inmutabilidad: construimos el objeto de respuesta sin mutar el original
  const usuarioRespuesta = construirRespuestaUsuario(usuario)

  res.json({ mensaje: 'Login exitoso', token, usuario: usuarioRespuesta })
}

const login = conManejadorDeErrores(conValidacion(_loginLogica))

// ── ENVÍO DEL CÓDIGO POR WHATSAPP (sandbox de Twilio)
//    Requiere que el usuario haya vinculado su WhatsApp mandando
//    "join <código-sandbox>" al número +1 415 523 8886 (una vez cada 72h).
const WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886'
const WHATSAPP_TEMPLATE_SID = process.env.TWILIO_WHATSAPP_TEMPLATE_SID || 'HX2294f92c7a197a9fd5889d4835900a7c'

const enviarCodigoPorWhatsApp = async (telefono, codigo) => {
  // 1er intento: plantilla pre-aprobada "Verification Codes" (válida fuera de la ventana de 24h)
  try {
    await twilioClient.messages.create({
      from: WHATSAPP_FROM,
      to: `whatsapp:+52${telefono}`,
      contentSid: WHATSAPP_TEMPLATE_SID,
      contentVariables: JSON.stringify({ 1: codigo })
    })
    return
  } catch (err) {
    // Errores del canal (no vinculado / sin ventana / canal inactivo) se reportan tal cual;
    // cualquier otro (p. ej. 21655 = plantilla no disponible) → probar mensaje libre
    if ([63007, 63015, 63016].includes(err.code)) throw err
  }
  // 2do intento: mensaje libre (funciona dentro de las 24h posteriores al "join")
  await twilioClient.messages.create({
    from: WHATSAPP_FROM,
    to: `whatsapp:+52${telefono}`,
    body: `Tu código de verificación de Cafetería 2 ITLC es: ${codigo}. Válido por 5 minutos.`
  })
}

// ── ENVIAR CÓDIGO
const enviarCodigo = conManejadorDeErrores(async (req, res) => {
  // [2] Desestructuración
  const { telefono } = req.body

  // [1] Función pura de validación
  if (!esTelefonoValido(telefono)) {
    return res.status(400).json({ mensaje: 'Teléfono inválido' })
  }

  const [rows] = await pool.query(
    'SELECT id_usuario FROM usuarios WHERE telefono = ? AND activo = 1', [telefono]
  )

  if (rows.length === 0) {
    return res.json({ mensaje: 'Si el número existe, recibirás un código' })
  }

  await pool.query(
    'UPDATE recuperacion_contrasena SET usado = 1 WHERE id_usuario = ? AND usado = 0',
    [rows[0].id_usuario]
  )

  const codigo = Math.floor(100000 + Math.random() * 900000).toString()
  const expira = new Date(Date.now() + 5 * 60 * 1000)

  await pool.query(
    'INSERT INTO recuperacion_contrasena (id_usuario, codigo, expira_en) VALUES (?,?,?)',
    [rows[0].id_usuario, codigo, expira]
  )

  try {
    await enviarCodigoPorWhatsApp(telefono, codigo)
  } catch (errTwilio) {
    console.error('Twilio no pudo enviar el WhatsApp:', errTwilio.code, '-', errTwilio.message)
    const ayudaVinculacion = process.env.TWILIO_SANDBOX_CODE
      ? `Desde tu WhatsApp manda el mensaje "join ${process.env.TWILIO_SANDBOX_CODE}" al número +1 415 523 8886 e inténtalo de nuevo.`
      : 'Vincula tu WhatsApp al sandbox de Twilio (en console.twilio.com: Messaging → Try it out → WhatsApp) e inténtalo de nuevo.'
    // 63015 = WhatsApp no vinculado al sandbox · 63016 = ventana de 24h expirada
    if (errTwilio.code === 63015 || errTwilio.code === 63016) {
      return res.status(502).json({ mensaje: `No pudimos enviarte el WhatsApp. ${ayudaVinculacion}` })
    }
    // 63007 = el canal de WhatsApp no está activado en la cuenta de Twilio
    if (errTwilio.code === 63007) {
      return res.status(502).json({
        mensaje: 'El canal de WhatsApp no está activado todavía en la cuenta de Twilio. Actívalo en console.twilio.com (Messaging → Try it out → WhatsApp) e inténtalo de nuevo.'
      })
    }
    return res.status(502).json({
      mensaje: 'No se pudo enviar el WhatsApp en este momento, inténtalo de nuevo más tarde'
    })
  }

  console.log(`WhatsApp enviado a +52${telefono} — Código: ${codigo}`)
  res.json({ mensaje: 'Si el número existe, recibirás un código por WhatsApp' })
})

// ── VERIFICAR CÓDIGO
const verificarCodigo = conManejadorDeErrores(async (req, res) => {
  // [2] Desestructuración
  const { telefono, codigo } = req.body

  if (!telefono || !codigo) {
    return res.status(400).json({ mensaje: 'Datos incompletos' })
  }

  const [rows] = await pool.query(
    `SELECT r.* FROM recuperacion_contrasena r
     JOIN usuarios u ON r.id_usuario = u.id_usuario
     WHERE u.telefono = ? AND r.codigo = ? AND r.usado = 0 AND r.expira_en > NOW()
     ORDER BY r.creado_en DESC LIMIT 1`,
    [telefono, codigo]
  )

  if (rows.length === 0) {
    return res.status(400).json({ mensaje: 'Código inválido o expirado' })
  }

  res.json({ mensaje: 'Código válido', id_recuperacion: rows[0].id })
})

// ── RESTABLECER CONTRASEÑA
const restablecerPassword = conManejadorDeErrores(async (req, res) => {
  // [2] Desestructuración
  const { telefono, codigo, nueva_contrasena } = req.body

  // [1] Función pura de validación
  if (!esPasswordValida(nueva_contrasena)) {
    return res.status(400).json({
      mensaje: 'La contraseña debe tener mínimo 8 caracteres con letras y números'
    })
  }

  const [rows] = await pool.query(
    `SELECT r.*, u.id_usuario FROM recuperacion_contrasena r
     JOIN usuarios u ON r.id_usuario = u.id_usuario
     WHERE u.telefono = ? AND r.codigo = ? AND r.usado = 0 AND r.expira_en > NOW()
     ORDER BY r.creado_en DESC LIMIT 1`,
    [telefono, codigo]
  )

  if (rows.length === 0) {
    return res.status(400).json({ mensaje: 'Código inválido o expirado' })
  }

  const hash = await bcrypt.hash(nueva_contrasena, 12)

  await pool.query(
    'UPDATE usuarios SET contrasena = ?, intentos_fallidos = 0 WHERE id_usuario = ?',
    [hash, rows[0].id_usuario]
  )

  await pool.query(
    'UPDATE recuperacion_contrasena SET usado = 1 WHERE id = ?',
    [rows[0].id]
  )

  res.json({ mensaje: 'Contraseña actualizada exitosamente' })
})

module.exports = {
  validarRegistro,
  validarLogin,
  registro,
  login,
  enviarCodigo,
  verificarCodigo,
  restablecerPassword,
  // Exportamos también las funciones puras para reutilización
  esTelefonoValido,
  esPasswordValida,
  calcularIntentosRestantes,
  crearPayloadToken,
}
