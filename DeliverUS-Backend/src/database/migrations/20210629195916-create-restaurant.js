module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Restaurants', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      name: {
        allowNull: false,
        type: Sequelize.STRING
      },
      description: {
        type: Sequelize.TEXT
      },
      address: {
        allowNull: false,
        type: Sequelize.STRING
      },
      postalCode: {
        allowNull: false,
        type: Sequelize.STRING
      },
      url: {
        type: Sequelize.STRING
      },
      shippingCosts: {
        allowNull: false,
        defaultValue: 0.0,
        type: Sequelize.DOUBLE
      },
      averageServiceMinutes: {
        allowNull: true,
        type: Sequelize.DOUBLE
      },
      email: {
        type: Sequelize.STRING
      },
      phone: {
        type: Sequelize.STRING
      },
      logo: {
        type: Sequelize.STRING
      },
      heroImage: {
        type: Sequelize.STRING
      },
      status: {
        type: Sequelize.ENUM,
        values: [
          'online',
          'offline',
          'closed',
          'temporarily closed'
        ],
        defaultValue: 'offline'
      },
      // SOLUCION 
      promoted: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      // SOLUCION
      sortByPrice: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      // SOLUCION
      discountCode: {
        allowNull: true,
        type: Sequelize.STRING,
        len: [1, 10]
      },
      discount: {
        allowNull: true,
        type: Sequelize.DOUBLE,
        min: 1,
        max: 99
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: new Date()
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: new Date()
      },
      userId: {
        allowNull: false,
        type: Sequelize.INTEGER,
        onDelete: 'CASCADE',
        references: {
          model: {
            tableName: 'Users'
          },
          key: 'id'
        }
      },
      restaurantCategoryId: {
        allowNull: false,
        type: Sequelize.INTEGER,
        references: {
          model: {
            tableName: 'RestaurantCategories'
          },
          key: 'id'
        }
      }
    })
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Restaurants')
  }
}
