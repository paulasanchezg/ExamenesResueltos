// eslint-disable-next-line no-unused-vars
import { Order, Product, Restaurant, User, sequelizeSession } from '../models/models.js'
import moment from 'moment'
import { Op } from 'sequelize'
const generateFilterWhereClauses = function (req) {
  const filterWhereClauses = []
  if (req.query.status) {
    switch (req.query.status) {
      case 'pending':
        filterWhereClauses.push({
          startedAt: null
        })
        break
      case 'in process':
        filterWhereClauses.push({
          [Op.and]: [
            {
              startedAt: {
                [Op.ne]: null
              }
            },
            { sentAt: null },
            { deliveredAt: null }
          ]
        })
        break
      case 'sent':
        filterWhereClauses.push({
          [Op.and]: [
            {
              sentAt: {
                [Op.ne]: null
              }
            },
            { deliveredAt: null }
          ]
        })
        break
      case 'delivered':
        filterWhereClauses.push({
          sentAt: {
            [Op.ne]: null
          }
        })
        break
    }
  }
  if (req.query.from) {
    const date = moment(req.query.from, 'YYYY-MM-DD', true)
    filterWhereClauses.push({
      createdAt: {
        [Op.gte]: date
      }
    })
  }
  if (req.query.to) {
    const date = moment(req.query.to, 'YYYY-MM-DD', true)
    filterWhereClauses.push({
      createdAt: {
        [Op.lte]: date.add(1, 'days') // FIXME: se pasa al siguiente día a las 00:00
      }
    })
  }
  return filterWhereClauses
}

// Returns :restaurantId orders
const indexRestaurant = async function (req, res) {
  const whereClauses = generateFilterWhereClauses(req)
  whereClauses.push({
    restaurantId: req.params.restaurantId
  })
  try {
    const orders = await Order.findAll({
      where: whereClauses,
      include: {
        model: Product,
        as: 'products'
      }
    })
    res.json(orders)
  } catch (err) {
    res.status(500).send(err)
  }
}

// TODO: Implement the indexCustomer function that queries orders from current logged-in customer and send them back.
// Orders have to include products that belongs to each order and restaurant details
// sort them by createdAt date, desc.

// Los pedidos deben incluir los productos que pertenecen a cada pedido y los detalles del restaurante.
// ordenarlos por fecha de creación, desc.
const indexCustomer = async function (req, res) {
  try {
    // Busca todos los pedidos (Order) del cliente actual (req.user.id), incluyendo los productos y el restaurante asociado a cada pedido. 
    // Los resultados se ordenan por la fecha de creación en orden descendente.
    const orders = await Order.findAll({
      where: { userId: req.user.id },
      include: [
        {
          model: Product,
          as: 'products'
        },
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: { exclude: ['createdAt', 'updatedAt'] }
        }
      ],
      order: [['createdAt', 'DESC']]
    })

    for (const order of orders) {
      const orderProducts = []
      for (const product of order.products) { // Se recorren los productos de cada pedido
        if (product.OrderProducts.OrderId === order.id) { // Si el producto pertenece al pedido
          orderProducts.push(product) // Se añade ese producto a la variable definida arriba
        }
      }
      order.products = [...orderProducts] // Los pedidos que cumplan la condicion anterior se añaden a la lista de productos del pedido
      // Los tres puntos son el operador de propagacion, simplemente coloca los elementos de un array en otro
    }
    res.json(orders)
  } catch (err) {
    res.status(500).send(err)
  }
}

// TODO: Implement the create function that receives a new order and stores it in the database.
// Take into account that:
// 1. If price is greater than 10€, shipping costs have to be 0.
// 2. If price is less or equals to 10€, shipping costs have to be restaurant default shipping costs and have to be added to the order total price
// 3. In order to save the order and related products, start a transaction, store the order, store each product linea and commit the transaction
// 4. If an exception is raised, catch it and rollback the transaction

const create = async (req, res) => {
  const err = validationResult(req)
  if (err.errors.length > 0) {
    res.status(422).send(err)
  } else {
    let newOrder = Order.build(req.body)
    newOrder.userId = req.user.id
    // req.body have to include a products id array that belongs to the order to be created.
    newOrder.shippingCosts = 0
    newOrder.price = 0
    for (const product of req.body.products) {
      const productDB = await Product.findByPk(product.productId)
      newOrder.price += productDB.price * product.quantity
    }
    // If price is greater than 10€, shipping costs have to be 0
    // else price is less or equals to 10€, shipping costs have to be restaurant default
    // shipping costs and have to be added to the order total price.
    const restaurant = await Restaurant.findByPk(req.body.restaurantId)
    if (newOrder.price > 10) {
      newOrder.shippingCosts = 0
    } else {
      newOrder.shippingCosts = restaurant.shippingCosts
    }
    newOrder.price += newOrder.shippingCosts
    newOrder.createdAt = new Date()
    // In order to save the order and related products, start a transaction,
    // store the order, store each product linea and commit the transaction.
    const t = await Order.sequelize.transaction()
    try {
      newOrder = await newOrder.save({ t })
      for (const product of req.body.products) {
        const productDB = await Product.findByPk(product.productId)
        await newOrder.addProduct(productDB, { through: { quantity: product.quantity, unityPrice: productDB.price } })
      }
      const order = await Order.findByPk(newOrder.id, {
        include: [{
          model: Product,
          as: 'products'
        }]
      })
      await t.commit()
      res.json(order)
    } catch (error) { // If an exception is raised, catch it.
      if (error.name.includes('ValidationError')) {
        res.status(422).send(error)
      } else {
        await t.rollback() // And when you have finally catch it, rollback the transaction.
        res.status(500).send(error)
      }
    }
  }
}


// TODO: Implement the update function that receives a modified order and persists it in the database.
// Take into account that:
// 1. If price is greater than 10€, shipping costs have to be 0.
// 2. If price is less or equals to 10€, shipping costs have to be restaurant default shipping costs and have to be added to the order total price
// 3. In order to save the updated order and updated products, start a transaction, update the order, remove the old related OrderProducts and store the new product lines, and commit the transaction
// 4. If an exception is raised, catch it and rollback the transaction
const update = async function (req, res) {
  const transaction = await Sequelize.transaction()
  const restaurant = await Restaurant.findByPk(req.body.restaurantId) // Buscamos el restaurante al que se le está realizando el pedido mediante su id.
  let totalPrice = 0.0 // Inicializamos la variable 'totalPrice' a 0 (euros)
  for (const product of req.body.products) { // En base a una constante 'product', hacemos un bucle for que recorra todos los productos.
    const databaseProduct = await Product.findByPk(product.productId) // En base a una constante 'databaseProduct', buscamos la información del producto en la base de datos mediante su ID.
    totalPrice += product.quantity * databaseProduct.price // Calculamos el precio total según la cantidad del producto y el precio del producto.
  }

  let shippingCosts = 0 // Establecemos en la variable 'shippingCosts' los costes de envío a 0.
  if (totalPrice <= 10.0) { // Si el precio total de los productos es inferior a 10 (euros)...
    shippingCosts = restaurant.shippingCosts // ... el coste de envío no será gratuito, es decir, el cliente deberá pagar el precio de envío.
  }

  req.body.price = totalPrice + shippingCosts // Actualizamos el precio total de la orden sumando el coste de envío.
  req.body.shippingCosts = shippingCosts // Actualizamos el coste de envío en la orden.
  let updatedOrder = await Order.findByPk(req.params.orderId) // Buscamos la orden a actualizar.
  try {
    await Order.update(req.body, { where: { id: req.params.orderId }, transaction })
    // Actualizamos la orden con los nuevos datos.
    await updatedOrder.setProducts([], { transaction }) // Borramos los productos asociados a la orden.
    for (const product of req.body.products) { // Por cada producto en los datos de la orden actualizada...
      const databaseProduct = await Product.findByPk(product.productId) // ... buscamos el producto en la base de datos.
      await updatedOrder.addProduct(databaseProduct, { // Agregamos el producto a la orden actualizada.
        through: { quantity: product.quantity, unityPrice: databaseProduct.price }, // Añadimos la cantidad de producto y el precio unitario del producto.
        transaction
      })
    }
    await transaction.commit() // Si no se producen errores, se confirman todos los cambios realizados durante la transacción.
    updatedOrder = await Order.findByPk(req.params.orderId, { include: [{ model: Product, as: 'products' }] }) // Buscamos la orden actualizada con los productos asociados.

    res.json(updatedOrder) // Devolvemos la orden actualizada como respuesta.
  } catch (error) { // Si hay un error...
    await transaction.rollback() // ... se realiza un rollback de la transacción.
    res.status(500).send(error) // Y se envía una respuesta HTTP con un estado de error 500 (error por parte del servidor)
    // y el mensaje de error en el cuerpo de la respuesta.
  }
}


// TODO: Implement the destroy function that receives an orderId as path param and removes the associated order from the database.
// Take into account that:
// 1. The migration include the "ON DELETE CASCADE" directive so OrderProducts related to this order will be automatically removed.
const destroy = async function (req, res) {
  try {
    const orderId = req.params.orderId // Obtenemos el id de la orden de los parámetros de la solicitud.
    const result = await Order.destroy({ where: { id: orderId } }) // Eliminamos con destroy la orden correspondiente en la base de datos.
    let message = ''
    if (result === 1) {
      message = `Successfully deleted order with id ${orderId}` // Se borró correctamente la orden correspondiente al id.
    } else {
      message = `Could not delete order with id ${orderId}` // No se pudo borrar la orden correspondiente al id.
    }
    res.json(message)
  } catch (error) {
    console.error(error) // En caso de error, se registra en la consola
    res.status(500).send(error) // y se envía una respuesta de error
  }
}

const confirm = async function (req, res) {
  try {
    const order = await Order.findByPk(req.params.orderId)
    order.startedAt = new Date()
    const updatedOrder = await order.save()
    res.json(updatedOrder)
  } catch (err) {
    res.status(500).send(err)
  }
}

const send = async function (req, res) {
  try {
    const order = await Order.findByPk(req.params.orderId)
    order.sentAt = new Date()
    const updatedOrder = await order.save()
    res.json(updatedOrder)
  } catch (err) {
    res.status(500).send(err)
  }
}

const deliver = async function (req, res) {
  try {
    const order = await Order.findByPk(req.params.orderId)
    order.deliveredAt = new Date()
    const updatedOrder = await order.save()
    const restaurant = await Restaurant.findByPk(order.restaurantId)
    const averageServiceTime = await restaurant.getAverageServiceTime()
    await Restaurant.update({ averageServiceMinutes: averageServiceTime }, { where: { id: order.restaurantId } })
    res.json(updatedOrder)
  } catch (err) {
    res.status(500).send(err)
  }
}

const show = async function (req, res) {
  try {
    const order = await Order.findByPk(req.params.orderId, {
      include: [{
        model: Restaurant,
        as: 'restaurant',
        attributes: ['name', 'description', 'address', 'postalCode', 'url', 'shippingCosts', 'averageServiceMinutes', 'email', 'phone', 'logo', 'heroImage', 'status', 'restaurantCategoryId']
      },
      {
        model: User,
        as: 'user',
        attributes: ['firstName', 'email', 'avatar', 'userType']
      },
      {
        model: Product,
        as: 'products'
      }]
    })
    res.json(order)
  } catch (err) {
    res.status(500).send(err)
  }
}

const analytics = async function (req, res) {
  const yesterdayZeroHours = moment().subtract(1, 'days').set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
  const todayZeroHours = moment().set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
  try {
    const numYesterdayOrders = await Order.count({
      where:
      {
        createdAt: {
          [Op.lt]: todayZeroHours,
          [Op.gte]: yesterdayZeroHours
        },
        restaurantId: req.params.restaurantId
      }
    })
    const numPendingOrders = await Order.count({
      where:
      {
        startedAt: null,
        restaurantId: req.params.restaurantId
      }
    })
    const numDeliveredTodayOrders = await Order.count({
      where:
      {
        deliveredAt: { [Op.gte]: todayZeroHours },
        restaurantId: req.params.restaurantId
      }
    })

    const invoicedToday = await Order.sum(
      'price',
      {
        where:
        {
          createdAt: { [Op.gte]: todayZeroHours }, // FIXME: Created or confirmed?
          restaurantId: req.params.restaurantId
        }
      })
    res.json({
      restaurantId: req.params.restaurantId,
      numYesterdayOrders,
      numPendingOrders,
      numDeliveredTodayOrders,
      invoicedToday
    })
  } catch (err) {
    res.status(500).send(err)
  }
}

const OrderController = {
  indexRestaurant,
  indexCustomer,
  create,
  update,
  destroy,
  confirm,
  send,
  deliver,
  show,
  analytics
}
export default OrderController
