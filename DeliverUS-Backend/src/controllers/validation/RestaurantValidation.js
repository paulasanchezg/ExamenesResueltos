import { check } from 'express-validator'
import { checkFileIsImage, checkFileMaxSize } from './FileValidationHelper.js'
const maxFileSize = 2000000 // around 2Mb

// SOLUCION
import { Restaurant } from '../../models/models.js'
import Op from 'sequelize'

// asegura que cada código de descuento es único dentro del conjunto de restaurantes que posee un usuario.
const checkDiscountCodeNotRepeated = async (discountCode, ownerId, restaurantId) => {
  // Se crea un objeto whereClauses con las condiciones iniciales para la consulta.
  const whereClauses = {
    userId: ownerId,
    discountCode
  }
  { /* Si se proporciona restaurantId, se añade una condición adicional para excluir este restaurante 
  de la búsqueda (Op.ne significa "not equal"). Esto es útil cuando se actualiza un restaurante existente 
  y queremos asegurarnos de que el código de descuento no se repita en otros restaurantes del mismo 
  propietario, excluyendo el restaurante que está siendo actualizado. */}
  if (restaurantId) {
    whereClauses.id =
    {
      [Op.ne]: restaurantId
    }
  }
  // Utiliza el método count de Sequelize para contar el número de restaurantes que cumplen con las condiciones especificadas en whereClauses.
  const numberRestaurantsWithSameDiscountCode = await Restaurant.count({
    where: whereClauses
  })

  if (numberRestaurantsWithSameDiscountCode >= 1) {
    throw new Error('Restaurant discount codes cannot repeat among restaurants of the same owner.')
  }
  return true
}

const checkBussinessRuleOneRestaurantPromotedByOwner = async (ownerId, promotedValue) => {
  if (promotedValue) {
    try {
      const promotedRestaurants = await Restaurant.findAll({ where: { userId: ownerId, promoted: true } })
      if (promotedRestaurants.length !== 0) {
        return Promise.reject(new Error('You can only promote one restaurant at a time'))
      }
    } catch (err) {
      return Promise.reject(new Error(err))
    }
  }

  return Promise.resolve('ok')
}


const create = [
  check('name').exists().isString().isLength({ min: 1, max: 255 }).trim(),
  check('description').optional({ nullable: true, checkFalsy: true }).isString().trim(),
  check('address').exists().isString().isLength({ min: 1, max: 255 }).trim(),
  check('postalCode').exists().isString().isLength({ min: 1, max: 255 }),
  check('url').optional({ nullable: true, checkFalsy: true }).isString().isURL().trim(),
  check('shippingCosts').exists().isFloat({ min: 0 }).toFloat(),
  check('email').optional({ nullable: true, checkFalsy: true }).isString().isEmail().trim(),
  check('phone').optional({ nullable: true, checkFalsy: true }).isString().isLength({ min: 1, max: 255 }).trim(),
  check('restaurantCategoryId').exists({ checkNull: true }).isInt({ min: 1 }).toInt(),
  check('userId').not().exists(),
  // SOLUCION
  check('discountCode').optional({ nullable: true, checkFalsy: true }).isString().isLength({ min: 1, max: 10 }).trim(),
    check('discount').optional({ nullable: true, checkFalsy: true }).isFloat({ min: 1, max: 99 }).toFloat(),
    check('discountCode').custom(async (value, { req }) => {
      if (value) {
        return await checkDiscountCodeNotRepeated(value, req.user.id)
      }
      return true
    }).withMessage('Restaurant discount codes cannot repeat among restaurants of the same owner.'),
  // SOLUCION
  check('promoted')
    .custom(async (value, { req }) => {
      return checkBussinessRuleOneRestaurantPromotedByOwner(req.user.id, value)
    })
    .withMessage('You can only promote one restaurant at a time'),
  check('heroImage').custom((value, { req }) => {
    return checkFileIsImage(req, 'heroImage')
  }).withMessage('Please upload an image with format (jpeg, png).'),
  check('heroImage').custom((value, { req }) => {
    return checkFileMaxSize(req, 'heroImage', maxFileSize)
  }).withMessage('Maximum file size of ' + maxFileSize / 1000000 + 'MB'),
  check('logo').custom((value, { req }) => {
    return checkFileIsImage(req, 'logo')
  }).withMessage('Please upload an image with format (jpeg, png).'),
  check('logo').custom((value, { req }) => {
    return checkFileMaxSize(req, 'logo', maxFileSize)
  }).withMessage('Maximum file size of ' + maxFileSize / 1000000 + 'MB')
]
const update = [
  check('name').exists().isString().isLength({ min: 1, max: 255 }).trim(),
  check('description').optional({ nullable: true, checkFalsy: true }).isString().trim(),
  check('address').exists().isString().isLength({ min: 1, max: 255 }).trim(),
  check('postalCode').exists().isString().isLength({ min: 1, max: 255 }),
  check('url').optional({ nullable: true, checkFalsy: true }).isString().isURL().trim(),
  check('shippingCosts').exists().isFloat({ min: 0 }).toFloat(),
  check('email').optional({ nullable: true, checkFalsy: true }).isString().isEmail().trim(),
  check('phone').optional({ nullable: true, checkFalsy: true }).isString().isLength({ min: 1, max: 255 }).trim(),
  check('restaurantCategoryId').exists({ checkNull: true }).isInt({ min: 1 }).toInt(),
  check('userId').not().exists(),
  // SOLUCION
  check('discountCode').optional({ nullable: true, checkFalsy: true }).isString().isLength({ min: 1, max: 10 }).trim(),
    check('discount').optional({ checkFalsy: true }).isFloat({ min: 1, max: 99 }).toFloat(),
    check('discountCode').custom(async (value, { req }) => {
      if (value) {
        return await checkDiscountCodeNotRepeated(value, req.user.id, req.params.restaurantId)
      }
      return true
    }).withMessage('Restaurant discount codes cannot repeat among restaurants of the same owner.'),
    // SOLUCION
    check('promoted')
    .custom(async (value, { req }) => {
      return checkBussinessRuleOneRestaurantPromotedByOwner(req.user.id, value)
    })
    .withMessage('You can only promote one restaurant at a time'),
  check('heroImage').custom((value, { req }) => {
    return checkFileIsImage(req, 'heroImage')
  }).withMessage('Please upload an image with format (jpeg, png).'),
  check('heroImage').custom((value, { req }) => {
    return checkFileMaxSize(req, 'heroImage', maxFileSize)
  }).withMessage('Maximum file size of ' + maxFileSize / 1000000 + 'MB'),
  check('logo').custom((value, { req }) => {
    return checkFileIsImage(req, 'logo')
  }).withMessage('Please upload an image with format (jpeg, png).'),
  check('logo').custom((value, { req }) => {
    return checkFileMaxSize(req, 'logo', maxFileSize)
  }).withMessage('Maximum file size of ' + maxFileSize / 1000000 + 'MB')
]

export { create, update }
