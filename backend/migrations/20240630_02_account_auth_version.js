const { DataTypes } = require("sequelize");

module.exports = {
  up: async ({ context }) => context.addColumn("users", "auth_version", {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  }),
  down: async ({ context }) => context.removeColumn("users", "auth_version"),
};
