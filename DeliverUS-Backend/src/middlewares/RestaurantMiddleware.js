import { Restaurant, Order } from '../models/models.js'

// SOLUCION: Validación de la operación
// verifica si es válido cambiar el estado de un restaurante antes de permitir que la solicitud pase al siguiente middleware o controlador
const checkValidStatusChange =  async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findByPk(req.params.restaurantId)
    // Cuenta los pedidos asociados con el restaurante que no han sido entregados 
    const count = await Order.count({
      where: {
        restaurantId: req.params.restaurantId,
        deliveredAt: { [Op.is]: null }
      }
    })
    // Comprueba si el estado actual del restaurante es "online" o "offline" y si no hay pedidos no entregados
    if ((restaurant.status === 'online' || restaurant.status === 'offline') && count === 0) {
      return next()
    }
    return res.status(403).send('Not valid status change. This entity is closed or temporaly closed or has incomplete orders (not deliverAt valid value).')
  } catch (err) {
    return res.status(500).send(err)
  }
}

const checkRestaurantOwnership = async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findByPk(req.params.restaurantId)
    if (req.user.id === restaurant.userId) {
      return next()
    }
    return res.status(403).send('Not enough privileges. This entity does not belong to you')
  } catch (err) {
    return res.status(500).send(err)
  }
}
const restaurantHasNoOrders = async (req, res, next) => {
  try {
    const numberOfRestaurantOrders = await Order.count({
      where: { restaurantId: req.params.restaurantId }
    })
    if (numberOfRestaurantOrders === 0) {
      return next()
    }
    return res.status(409).send('Some orders belong to this restaurant.')
  } catch (err) {
    return res.status(500).send(err.message)
  }
}

export { checkRestaurantOwnership, restaurantHasNoOrders }
