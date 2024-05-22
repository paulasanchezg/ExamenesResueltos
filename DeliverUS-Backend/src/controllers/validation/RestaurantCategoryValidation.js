// SOLUCION
import { check } from 'express-validator'
import { RestaurantCategory } from '../../models/models.js'

const checkRestaurantCategoryNotExists = async (value, { req }) => {
  try {
    const restaurantCategory = await
    RestaurantCategory.findOne({ where: { name: value } })
    if (restaurantCategory === null) {
      return Promise.resolve()
    } else {
      return Promise.reject(new Error('The category ' + value + ' already exists.'))
    }
  } catch (err) {
    return Promise.reject(new Error(err))
  }
}

const create = [
  check('name').exists().isString().isLength({ min: 1, max: 50 }).trim(),
  check('name').custom(checkRestaurantCategoryNotExists)
]

export { create }
