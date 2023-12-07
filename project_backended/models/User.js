const { DataTypes } = require('sequelize');
const sequelize = require('../config');
const User = sequelize.define(
    "User",
    {
        id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true,
        },
        organisation_id: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        email: {
            type: DataTypes.STRING,
            allowNull: true,
            validate: {
                isEmail: true,
            },
        },
        hub_id: {
            type: DataTypes.STRING,
            allowNull: true,
        },
    },
    {
        tableName: "users",
    }
);

module.exports = User;