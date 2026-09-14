const router = require('express').Router()
const { getCategorias, getProductos, getPromociones, agregarProducto, editarProducto, eliminarProducto } = require('../controllers/menuController')
const { verificarToken, soloAdmin } = require('../middleware/auth')

router.get('/categorias',           getCategorias)
router.get('/productos',            getProductos)
router.get('/promociones',          getPromociones)
router.post('/productos',           verificarToken, soloAdmin, agregarProducto)
router.put('/productos/:id',        verificarToken, soloAdmin, editarProducto)
router.delete('/productos/:id',     verificarToken, soloAdmin, eliminarProducto)

module.exports = router