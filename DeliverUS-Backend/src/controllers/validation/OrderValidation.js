import { Product, Order } from '../../models/models.js'
import { check } from 'express-validator'

// TODO: Include validation rules for create that should:
// 1. Check that restaurantId is present in the body and corresponds to an existing restaurant

// 2. Check that products is a non-empty array composed of objects with productId and quantity greater than 0
const checkProductAndQuantity = async (value, { req }) => {
  const products = req.body.products
  try {
    // Verificamos la cantidad de cada producto
    for (const product of products) {
      if (product.quantity < 0) {
        return Promise.reject(new Error('La cantidad de productos no puede ser negativa'))
      }
      if (product.quantity === 0) {
        return Promise.reject(new Error('Todos los productos deben tener una cantidad mayor que cero'))
      }
    }
    return Promise.resolve()
  } catch (err) {
    return Promise.reject(new Error(err))
  }
}

// 3. Check that products are available
const checkAvailability = async (value, { req }) => {
  const products = req.body.products
  try {
    for (const product of products) {
      const productDB = await Product.findByPk(product.productId)
      if (!productDB) {
        return Promise.reject(new Error('Product id is invalid'))
      } else if (productDB.restaurantId !== req.body.restaurantId) { // Esto es lo que salta, seguramente req.body.restaurantId no sea asi
        return Promise.reject(new Error('Product does not belong to the restaurant in the order'))
      } else if (productDB.availability <= 0) {
        return Promise.reject(new Error('The product is not available'))
      }
    }
    return Promise.resolve()
  } catch (err) {
    return Promise.reject(new Error(err))
  }
}

const checkSameRestaurant = async (value, { req }) => {
  const products = req.body.products

  try {
    const orderDB = await Order.findByPk(req.params.orderId, {
      include: [{
        model: Product,
        as: 'products'
      }]
    })
    if (!orderDB) {
      return Promise.reject(new Error('Order not found'))
    }
    for (const product of products) {
      const productDB = await Product.findByPk(product.productId)

      if (!productDB) {
        return Promise.reject(new Error('Product id is invalid'))
      } else if (productDB.restaurantId !== orderDB.restaurantId) {
        return Promise.reject(new Error('Product does not belong to the restaurant in the order'))
      }
    }

    // Todos los productos pertenecen al mismo restaurante que la orden
    return Promise.resolve()
  } catch (err) {
    return Promise.reject(new Error(err))
  }
}

const create = [
  check('address').exists().isString().isLength({ min: 1 }).trim(),
  check('restaurantId').exists().isInt({ min: 1 }).toInt(), // R1
  check('products.*.quantity').custom(checkProductAndQuantity), // R2
  check('products').isArray({ min: 1 }), // R2
  check('products').custom(checkAvailability) // R3

]
// TODO: Include validation rules for update that should:
// 1. Check that restaurantId is NOT present in the body.
// 2. Check that products is a non-empty array composed of objects with productId and quantity greater than 0
// 3. Check that products are available
// 4. Check that all the products belong to the same restaurant of the originally saved order that is being edited.
// 5. Check that the order is in the 'pending' state.

const update = [

  check('address').exists().isString().isLength({ min: 1 }).trim(),
  check('products').isArray({ min: 1 }),
  check('restaurantId').not().exists().withMessage('El id del restaurante no debe ser modificado'), // R1
  check('products.*.quantity').custom(checkProductAndQuantity), // R2

  check('products').custom(checkSameRestaurant) // R4

]

export { create, update }
