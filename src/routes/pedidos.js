const router = require('express').Router()
const { crearPedido, getMisPedidos, getTodosPedidos, actualizarEstado, getStatsHoy } = require('../controllers/pedidoController')
const { verificarToken, soloAdmin } = require('../middleware/auth')

router.post('/',         verificarToken, crearPedido)
router.get('/mis',       verificarToken, getMisPedidos)
router.get('/todos',     verificarToken, soloAdmin, getTodosPedidos)
router.put('/:id/estado',verificarToken, soloAdmin, actualizarEstado)
router.get('/stats/hoy', verificarToken, soloAdmin, getStatsHoy)

module.exports = router