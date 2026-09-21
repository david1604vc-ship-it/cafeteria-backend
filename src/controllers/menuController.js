const pool = require('../db')

// OBTENER CATEGORÍAS
const getCategorias = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM categorias WHERE activo = 1 ORDER BY orden'
    )
    res.json(rows)
  } catch (err) {
    res.status(500).json({ mensaje: 'Error al obtener categorías', error: err.message })
  }
}

// OBTENER PRODUCTOS (todos o por categoría)
const getProductos = async (req, res) => {
  const { categoria } = req.query

  try {
    let query = `
      SELECT p.*, c.nombre as categoria, c.icono as categoria_icono 
      FROM productos p 
      JOIN categorias c ON p.id_categoria = c.id_categoria
      WHERE p.disponible = 1`
    const params = []

    if (categoria) {
      query += ' AND p.id_categoria = ?'
      params.push(categoria)
    }

    query += ' ORDER BY c.orden, p.nombre'
    const [rows] = await pool.query(query, params)
    res.json(rows)
  } catch (err) {
    res.status(500).json({ mensaje: 'Error al obtener productos', error: err.message })
  }
}

// OBTENER PROMOCIONES
const getPromociones = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT pr.*, p.nombre as producto_nombre
       FROM promociones pr
       LEFT JOIN productos p ON pr.id_producto = p.id_producto
       WHERE pr.activo = 1`
    )
    res.json(rows)
  } catch (err) {
    res.status(500).json({ mensaje: 'Error al obtener promociones', error: err.message })
  }
}

// OBTENER TODOS LOS PRODUCTOS INCLUIDO NO DISPONIBLES (solo admin)
const getAdminProductos = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.*, c.nombre as categoria, c.icono as categoria_icono
       FROM productos p
       JOIN categorias c ON p.id_categoria = c.id_categoria
       ORDER BY c.orden, p.nombre`
    )
    res.json(rows)
  } catch (err) {
    res.status(500).json({ mensaje: 'Error al obtener productos', error: err.message })
  }
}

// AGREGAR PRODUCTO (solo admin)
const agregarProducto = async (req, res) => {
  const { id_categoria, nombre, descripcion, precio, imagen_url, unidad, subcategoria } = req.body

  if (!id_categoria || !nombre || precio === undefined) {
    return res.status(400).json({ mensaje: 'Faltan datos obligatorios (categoría, nombre, precio)' })
  }

  try {
    const [result] = await pool.query(
      'INSERT INTO productos (id_categoria, nombre, descripcion, precio, imagen_url, unidad, subcategoria) VALUES (?,?,?,?,?,?,?)',
      [id_categoria, nombre, descripcion || null, precio, imagen_url || null, unidad || null, subcategoria || null]
    )
    res.status(201).json({ mensaje: 'Producto agregado', id_producto: result.insertId })
  } catch (err) {
    res.status(500).json({ mensaje: 'Error al agregar producto', error: err.message })
  }
}

// EDITAR PRODUCTO (solo admin)
const editarProducto = async (req, res) => {
  const { id } = req.params
  const { nombre, descripcion, precio, imagen_url, unidad, disponible, subcategoria, id_categoria } = req.body

  try {
    const [result] = await pool.query(
      `UPDATE productos SET
        nombre          = COALESCE(?, nombre),
        descripcion     = COALESCE(?, descripcion),
        precio          = COALESCE(?, precio),
        imagen_url      = COALESCE(?, imagen_url),
        unidad          = COALESCE(?, unidad),
        subcategoria    = COALESCE(?, subcategoria),
        id_categoria    = COALESCE(?, id_categoria),
        disponible      = COALESCE(?, disponible)
       WHERE id_producto = ?`,
      [nombre, descripcion, precio, imagen_url, unidad, subcategoria, id_categoria, disponible, id]
    )
    if (result.affectedRows === 0) {
      return res.status(404).json({ mensaje: 'Producto no encontrado' })
    }
    res.json({ mensaje: 'Producto actualizado' })
  } catch (err) {
    res.status(500).json({ mensaje: 'Error al editar producto', error: err.message })
  }
}

// ELIMINAR PRODUCTO (solo admin)
const eliminarProducto = async (req, res) => {
  const { id } = req.params

  try {
    await pool.query('UPDATE productos SET disponible = 0 WHERE id_producto = ?', [id])
    res.json({ mensaje: 'Producto desactivado' })
  } catch (err) {
    res.status(500).json({ mensaje: 'Error al eliminar producto', error: err.message })
  }
}

module.exports = { getCategorias, getProductos, getPromociones, getAdminProductos, agregarProducto, editarProducto, eliminarProducto }