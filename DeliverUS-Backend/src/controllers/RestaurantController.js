import { sequelizeSession, Restaurant, Product, RestaurantCategory, ProductCategory } from '../models/models.js'

const index = async function (req, res) {
  try {
    const restaurants = await Restaurant.findAll(
      {
        attributes: { exclude: ['userId'] },
        include:
      {
        model: RestaurantCategory,
        as: 'restaurantCategory'
      },
      // SOLUCION
      order: [['promoted', 'DESC'], [{ model: RestaurantCategory, as: 'restaurantCategory' }, 'name', 'ASC']]
      }
    )
    res.json(restaurants)
  } catch (err) {
    res.status(500).send(err)
  }
}

const indexOwner = async function (req, res) {
  try {
    const restaurants = await Restaurant.findAll(
      {
        attributes: { exclude: ['userId'] },
        where: { userId: req.user.id },
        // SOLUCION
        order: [['promoted', 'DESC']],
        include: [{
          model: RestaurantCategory,
          as: 'restaurantCategory'
        }]
      })
    res.json(restaurants)
  } catch (err) {
    res.status(500).send(err)
  }
}

const create = async function (req, res) {
  const newRestaurant = Restaurant.build(req.body)
  newRestaurant.userId = req.user.id // usuario actualmente autenticado
  try {
    const restaurant = await newRestaurant.save()
    res.json(restaurant)
  } catch (err) {
    res.status(500).send(err)
  }
}

// SOLUCION
const show = async function (req, res) {
   // Only returns PUBLIC information of restaurants
   try {
    let restaurant = await Restaurant.findByPk(req.params.restaurantId)

    // La función verifica si el restaurante tiene una propiedad sortByPrice.
    // Si es true, ordena los productos por su precio en orden ascendente ('price', 'ASC').
    // Si es false o no está presente, se ordenan los productos por un atributo order en orden ascendente ('order', 'ASC').
    const orderBy = restaurant.sortByPrice ? 
      [[{ model: Product, as: 'products' }, 'price', 'ASC']]
      : [[{ model: Product, as: 'products' }, 'order', 'ASC']]

    // Se vuelve a buscar el restaurante con findByPk, pero esta vez incluyendo relaciones y configurando el orden de los productos.
    restaurant = await Restaurant.findByPk(req.params.restaurantId, {
      // include especifica las asociaciones a incluir en los resultados: 
      // - Los productos (Product) asociados con el restaurante, incluyendo la categoría de producto (ProductCategory). 
      // - La categoría del restaurante (RestaurantCategory).
      // order aplica el criterio de ordenamiento determinado anteriormente.
      attributes: { exclude: ['userId'] },
      include: [{
        model: Product,
        as: 'products',
        include: { model: ProductCategory, as: 'productCategory' }
      },
      {
        model: RestaurantCategory,
        as: 'restaurantCategory'
      }],
      order: orderBy
    }
    )
    res.json(restaurant)
  } catch (err) {
    res.status(500).send(err)
  }
}

// SOLUCION
const toggleProductsSorting = async function (req, res) {
  try {
    const restaurant = await Restaurant.findByPk(req.params.restaurantId)
    restaurant.sortByPrice = !restaurant.sortByPrice
    await restaurant.save()
    res.json(restaurant)
  } catch (err) {
    res.status(500).send(err)
  }
}


const update = async function (req, res) {
  try {
    await Restaurant.update(req.body, { where: { id: req.params.restaurantId } })
    const updatedRestaurant = await Restaurant.findByPk(req.params.restaurantId)
    res.json(updatedRestaurant)
  } catch (err) {
    res.status(500).send(err)
  }
}

const destroy = async function (req, res) {
  try {
    const result = await Restaurant.destroy({ where: { id: req.params.restaurantId } })
    let message = ''
    if (result === 1) {
      message = 'Sucessfuly deleted restaurant id.' + req.params.restaurantId
    } else {
      message = 'Could not delete restaurant.'
    }
    res.json(message)
  } catch (err) {
    res.status(500).send(err)
  }
}

// SOLUCION
const promote = async function (req, res) {
  const t = await sequelizeSession.transaction()
  try {
    const existingPromotedRestaurant = await Restaurant.findOne({ where: { userId: req.user.id, promoted: true } })
    if (existingPromotedRestaurant) {
      await Restaurant.update(
        { promoted: false },
        { where: { id: existingPromotedRestaurant.id } },
        { transaction: t }
      )
    }
    await Restaurant.update(
      { promoted: true },
      { where: { id: req.params.restaurantId } },
      { transaction: t }
    )
    await t.commit()
    const updatedRestaurant = await Restaurant.findByPk(req.params.restaurantId)
    res.json(updatedRestaurant)
  } catch (err) {
    await t.rollback()
    res.status(500).send(err)
  }
}


const RestaurantController = {
  index,
  indexOwner,
  create,
  show,
  update,
  destroy,
  promote,
  toggleProductsSorting
}
export default RestaurantController
