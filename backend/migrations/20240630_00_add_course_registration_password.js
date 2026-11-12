const { DataTypes } = require("sequelize");

module.exports = {
  up: async ({ context }) => {
    await context.addColumn("courses", "registration_password_hash", {
      type: DataTypes.STRING,
      allowNull: true,
    });
  },

  down: async ({ context }) => {
    await context.removeColumn("courses", "registration_password_hash");
  },
};
