import { Model, DataTypes } from "sequelize";
import { sequelize } from "../utils/db";

class User extends Model {
  public id!: number;
  public name!: string;
  public username!: string;
  public role!: string;
  public email!: string;
  public passwordHash!: string;
  public authVersion!: number;
  public disabled!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    username: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: true,
      validate: {
        is: /^(?=[a-zA-Z0-9._-]{4,16}$)(?!.*[_.]{2})[^_.].*[^_.]$/,
      },
    },
    role: {
      type: DataTypes.ENUM("student", "teacher", "admin"),
      allowNull: false,
    },
    authVersion: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    disabled: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    passwordHash: {
      type: DataTypes.TEXT,
    },
    email: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: true,
      validate: {
        is: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/,
      },
    },
  },
  {
    sequelize,
    underscored: true,
    timestamps: true,
    modelName: "User",
  }
);

export default User;
