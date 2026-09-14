const router = require('express').Router()
const {
  validarRegistro,
  validarLogin,
  registro,
  login,
  enviarCodigo,
  verificarCodigo,
  restablecerPassword
} = require('../controllers/authController')

router.post('/registro',              validarRegistro, registro)
router.post('/login',                 validarLogin,    login)
router.post('/recuperar/enviar',      enviarCodigo)
router.post('/recuperar/verificar',   verificarCodigo)
router.post('/recuperar/restablecer', restablecerPassword)

module.exports = router