import { Model, DataTypes } from "sequelize";
import { sequelize } from "../utils/db";
import { ChapterType } from "../types";

class Course extends Model {
  public id!: number;
  public title!: string;
  public description!: string;
  public teacherId!: number;
  public chapters!: ChapterType[];
  public zoomName!: string;
  public registrationPasswordHash!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Course.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    title: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    template: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    registrationPasswordHash: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    zoomName: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },

  {
    sequelize,
    underscored: true,
    timestamps: true,
    modelName: "course",
    defaultScope: { attributes: { exclude: ["registrationPasswordHash"] } },
  }
);

export default Course;
