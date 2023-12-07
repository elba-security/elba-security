// Inside Authentication.js model file
const { DataTypes } = require('sequelize');
const sequelize = require('../config');

const Authentication = sequelize.define(
  'Authentication',
  {
    organizationId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    accessToken: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    refreshToken: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    tableName: 'authentication', // Set the table name explicitly
    timestamps: true, // Include timestamps (createdAt, updatedAt)
  }
);

module.exports = Authentication;
