const pool = require('../db')

// CREAR PEDIDO
const crearPedido = async (req, res) => {
  const { productos } = req.body
  const id_usuario = req.usuario.id_usuario

  if (!productos || productos.length === 0) {
    return res.status(400).json({ mensaje: 'El pedido debe tener al menos un producto' })
  }

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    const folio = '#' + String(Math.floor(Math.random() * 9000) + 1000).padStart(4, '0')
    let total = 0

    for (const p of productos) {
      const [rows] = await conn.query(
        'SELECT precio FROM productos WHERE id_producto = ? AND disponible = 1', [p.id_producto]
      )
      if (rows.length === 0) throw new Error(`Producto ${p.id_producto} no disponible`)
      total += rows[0].precio * p.cantidad
    }

    const [pedido] = await conn.query(
      'INSERT INTO pedidos (folio, id_usuario, total) VALUES (?,?,?)',
      [folio, id_usuario, total]
    )

    const id_pedido = pedido.insertId

    for (const p of productos) {
      const [rows] = await conn.query(
        'SELECT precio FROM productos WHERE id_producto = ?', [p.id_producto]
      )
      await conn.query(
        'INSERT INTO pedido_detalle (id_pedido, id_producto, cantidad, precio_unitario, subtotal) VALUES (?,?,?,?,?)',
        [id_pedido, p.id_producto, p.cantidad, rows[0].precio, rows[0].precio * p.cantidad]
      )
    }

    await conn.commit()
    res.status(201).json({ mensaje: 'Pedido creado', id_pedido, folio, total })
  } catch (err) {
    await conn.rollback()
    res.status(500).json({ mensaje: 'Error al crear pedido', error: err.message })
  } finally {
    conn.release()
  }
}

// OBTENER PEDIDOS DEL USUARIO
const getMisPedidos = async (req, res) => {
  const id_usuario = req.usuario.id_usuario

  try {
    const [pedidos] = await pool.query(
      `SELECT p.*, pg.estado as estado_pago 
       FROM pedidos p
       LEFT JOIN pagos pg ON p.id_pedido = pg.id_pedido
       WHERE p.id_usuario = ?
       ORDER BY p.creado_en DESC`,
      [id_usuario]
    )

    for (const pedido of pedidos) {
      const [detalle] = await pool.query(
        `SELECT pd.*, pr.nombre, pr.imagen_url
         FROM pedido_detalle pd
         JOIN productos pr ON pd.id_producto = pr.id_producto
         WHERE pd.id_pedido = ?`,
        [pedido.id_pedido]
      )
      pedido.productos = detalle
    }

    res.json(pedidos)
  } catch (err) {
    res.status(500).json({ mensaje: 'Error al obtener pedidos', error: err.message })
  }
}

// OBTENER TODOS LOS PEDIDOS (solo admin)
const getTodosPedidos = async (req, res) => {
  try {
    const [pedidos] = await pool.query(
      `SELECT p.*, u.nombre, u.apellido, u.telefono
       FROM pedidos p
       JOIN usuarios u ON p.id_usuario = u.id_usuario
       ORDER BY p.creado_en DESC`
    )
    res.json(pedidos)
  } catch (err) {
    res.status(500).json({ mensaje: 'Error al obtener pedidos', error: err.message })
  }
}

// ACTUALIZAR ESTADO DEL PEDIDO (solo admin)
const actualizarEstado = async (req, res) => {
  const { id } = req.params
  const { estado } = req.body

  try {
    await pool.query('UPDATE pedidos SET estado = ? WHERE id_pedido = ?', [estado, id])
    res.json({ mensaje: 'Estado actualizado' })
  } catch (err) {
    res.status(500).json({ mensaje: 'Error al actualizar estado', error: err.message })
  }
}

module.exports = { crearPedido, getMisPedidos, getTodosPedidos, actualizarEstado }