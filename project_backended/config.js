const { Sequelize } = require('sequelize');
const sequelize = new Sequelize({
  dialect: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'postgres',
  password: '1234',
  database: 'elba',
  logging: console.log,
});
module.exports = sequelize;

require('dotenv').config();
