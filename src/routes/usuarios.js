// =====================================================================
//  routes/usuarios.js — Paradigma Funcional aplicado
//  Cafetería 2 ITLC — Módulo de Inicio de Sesión
// =====================================================================

const router = require('express').Router()
const { verificarToken, soloAdmin } = require('../middleware/auth')
const pool = require('../db')

// ── [1] FUNCIONES PURAS
//    Transforman datos sin efectos secundarios

const formatearUsuario = (u) => ({
  id_usuario:        u.id_usuario,
  nombre:            u.nombre,
  apellido:          u.apellido,
  telefono:          u.telefono,
  id_rol:            u.id_rol,
  activo:            u.activo,
  intentos_fallidos: u.intentos_fallidos,
})

const estaBloqueado = (u) => u.intentos_fallidos >= 5
const estaActivo    = (u) => u.activo === 1

// ── [2] FUNCIONES DE ORDEN SUPERIOR
//    Reciben 'verificarToken' y 'soloAdmin' como middlewares-callbacks

// ── [3] FUNCIONES DE ARRAY — map, filter, reduce
//    Se aplican sobre los resultados de la base de datos

// Obtener todos los usuarios
router.get('/', verificarToken, soloAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id_usuario, nombre, apellido, telefono, id_rol, activo, intentos_fallidos
       FROM usuarios ORDER BY id_usuario ASC`
    )

    // [3] map: transforma cada fila usando la función pura formatearUsuario
    const usuarios = rows.map(formatearUsuario)

    // También podemos usar filter para separar bloqueados de activos
    const usuariosBloqueados = usuarios.filter(estaBloqueado)
    const usuariosActivos    = usuarios.filter(estaActivo)

    // [4] reduce: cuenta el total de intentos fallidos acumulados
    const totalIntentosFallidos = usuarios.reduce(
      (acum, u) => acum + u.intentos_fallidos, 0
    )

    console.log(`Total intentos fallidos en el sistema: ${totalIntentosFallidos}`)
    console.log(`Usuarios bloqueados: ${usuariosBloqueados.length}`)
    console.log(`Usuarios activos: ${usuariosActivos.length}`)

    res.json(usuarios)
  } catch (err) {
    console.error('Error al obtener usuarios:', err.message)
    res.status(500).json({ mensaje: 'Error en el servidor' })
  }
})

// ── [5] CALLBACKS en rutas
//    Los handlers de cada ruta son callbacks que Express ejecuta
//    cuando llega la petición correspondiente

// Activar / desactivar usuario
router.put('/:id/estado', verificarToken, soloAdmin, async (req, res) => {
  // [6] Desestructuración de parámetros
  const { id } = req.params
  const { activo } = req.body

  try {
    await pool.query(
      'UPDATE usuarios SET activo = ? WHERE id_usuario = ?', [activo, id]
    )
    // [1] Expresión ternaria pura: resultado depende solo del parámetro
    const mensaje = activo ? 'Usuario activado' : 'Usuario desactivado'
    res.json({ mensaje })
  } catch (err) {
    console.error('Error al cambiar estado:', err.message)
    res.status(500).json({ mensaje: 'Error en el servidor' })
  }
})

// Desbloquear usuario
router.put('/:id/desbloquear', verificarToken, soloAdmin, async (req, res) => {
  const { id } = req.params
  try {
    await pool.query(
      'UPDATE usuarios SET intentos_fallidos = 0 WHERE id_usuario = ?', [id]
    )
    res.json({ mensaje: 'Usuario desbloqueado' })
  } catch (err) {
    console.error('Error al desbloquear:', err.message)
    res.status(500).json({ mensaje: 'Error en el servidor' })
  }
})

// Eliminar usuario
router.delete('/:id', verificarToken, soloAdmin, async (req, res) => {
  const { id } = req.params
  try {
    await pool.query('DELETE FROM usuarios WHERE id_usuario = ?', [id])
    res.json({ mensaje: 'Usuario eliminado' })
  } catch (err) {
    console.error('Error al eliminar:', err.message)
    res.status(500).json({ mensaje: 'Error en el servidor' })
  }
})

module.exports = router
