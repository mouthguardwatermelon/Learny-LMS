import { Op } from "sequelize";
import {
  Course,
  User,
  Chapter,
  Section,
  File,
  Assignment,
  Submission,
  Announcement,
} from "../models";

export const getCommonInclude = (
  allCourses: boolean,
  role: string = "teacher",
  userId?: number
) => {
  const baseInclude: any[] = allCourses
    ? [
        {
          model: User,
          as: "teacher",
          attributes: ["name", "username", "id", "email", "role"],
        },
      ]
    : [
        {
          model: User,
          as: "teacher",
          attributes: ["name", "username", "id", "email", "role"],
        },
        {
          model: Announcement,
          as: "announcements",
          required: false,
          where: {
            expiry: {
              [Op.gt]: new Date(),
            },
          },
        },
        {
          model: Chapter,
          as: "chapters",
          attributes: ["title", "id", "createdAt", "pinned"],
          required: false,
          include: [
            {
              model: Section,
              as: "sections",
              include: [
                {
                  model: File,
                  as: "files",
                  required: false,
                },
                {
                  model: Assignment,
                  as: "assignments",
                  required: false,
                  include: [
                    {
                      model: Submission,
                      as: "submissions",
                      required: false,
                      include: [
                        {
                          model: User,
                          as: "student",
                          attributes: [
                            "name",
                            "username",
                            "id",
                            "email",
                            "role",
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ];
  const appendWhereClauseToFile = (includeArray: any, userId: number) => {
    includeArray.forEach((includeItem: any) => {
      if (includeItem.model === File) {
        includeItem.where = {
          visibledate: {
            [Op.lt]: new Date().toISOString(),
          },
        };
      }
      if (includeItem.model === Assignment) {
        includeItem.where = {
          visibledate: {
            [Op.lt]: new Date().toISOString(),
          },
        };
      }
      if (includeItem.model === Submission) {
        includeItem.where = {
          studentId: {
            [Op.eq]: userId,
          },
        };
      }
      if (includeItem.include) {
        appendWhereClauseToFile(includeItem.include, userId);
      }
    });
  };
  if (role === "student" && userId) {
    baseInclude.push({
      model: User,
      as: "students",
      where: { id: { [Op.eq]: userId } },
      attributes: ["name", "username", "id", "email", "role"],
      through: { attributes: [] },
    });
    appendWhereClauseToFile(baseInclude, userId);
  }

  if (role === "teacher") {
    baseInclude.push({
      model: User,
      as: "students",
      attributes: ["name", "username", "id", "email", "role"],
      through: { attributes: [] },
    });
  }

  return baseInclude;
};

export const getCommonOrder = (): any[] => [
  ["createdAt", "DESC"],
  [{ model: Chapter, as: "chapters" }, "createdAt", "DESC"],
  [
    { model: Chapter, as: "chapters" },
    { model: Section, as: "sections" },
    "createdAt",
    "ASC",
  ],
  [
    { model: Chapter, as: "chapters" },
    { model: Section, as: "sections" },
    { model: File, as: "files" },
    "createdAt",
    "ASC",
  ],
  [
    { model: Chapter, as: "chapters" },
    { model: Section, as: "sections" },
    { model: Assignment, as: "assignments" },
    "createdAt",
    "ASC",
  ],
];

export const getCoursesByRole = async (user: User) => {
  const commonAttributes = { exclude: ["teacherId"] };
  const commonInclude = getCommonInclude(true, user.role, user.id);

  let where = {};
  if (user.role === "teacher") {
    where = {
      teacherId: { [Op.eq]: user.id },
      template: { [Op.not]: true },
    };
  } else if (user.role === "student") {
    where = {
      template: { [Op.not]: true },
    };
  } else if (user.role === "admin") {
    where = {};
  }

  return await Course.findAll({
    attributes: commonAttributes,
    where,
    include: commonInclude,
    order: [["createdAt", "DESC"]],
  });
};

export const getOneCourseByRole = async (user: User, courseId: number) => {
  const commonAttributes = { exclude: ["teacherId"] };
  const commonInclude = getCommonInclude(false, user.role, user.id);
  const commonOrder = getCommonOrder();

  let where: any = { id: courseId };
  if (user.role === "teacher") {
    where = {
      ...where,
      teacherId: { [Op.eq]: user.id },
      template: { [Op.not]: true },
    };
  } else if (user.role === "student") {
    where = {
      ...where,
      template: { [Op.not]: true },
    };
  }

  return await Course.findAll({
    attributes: commonAttributes,
    where,
    include: commonInclude,
    order: commonOrder,
  });
};
