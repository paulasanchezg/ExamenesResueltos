import { get, post, put, destroy, patch } from './helpers/ApiRequestsHelper'
function getAll () {
  return get('users/myrestaurants')
}

function getDetail (id) {
  return get(`restaurants/${id}`)
}

function getRestaurantCategories () {
  return get('restaurantCategories')
}

function create (data) {
  return post('restaurants', data)
}

function update (id, data) {
  return put(`restaurants/${id}`, data)
}

function remove (id) {
  return destroy(`restaurants/${id}`)
}

// SOLUCION
function promote (id) {
  return patch(`restaurants/${id}`)
}

// SOLUCION
function createCategory (data) {
  return post('restaurantCategories', data)
}

// SOLUCION
function toggleProductsSorting (id) {
  return patch(`restaurants/${id}/toggleProductsSorting`)
}

export { getAll, getDetail, getRestaurantCategories, create, update, remove, promote, createCategory, toggleProductsSorting }
