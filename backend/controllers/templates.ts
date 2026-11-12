import { courseObjectLock, sequelize } from "../utils/db";
import express from "express";
import { Section, User, File, Chapter } from "../models";
import { Course } from "../models";
import { tokenExtractor } from "../utils/middleware";
import { ChapterType, CustomRequest } from "../types";
import { Op } from "sequelize";
import getUpdatedCourse from "../utils/getUpdatedCourse";

const router = express.Router();

// To get templates
router.get("/", tokenExtractor, async (req: CustomRequest, res, next) => {
  try {
    const user = req.user;
    console.log(user);

    if (!user) {
      return res.status(404).send("User not found");
    }

    // GET templates created by a teacher
    if (user.role === "teacher") {
      const templates = await Course.findAll({
        attributes: { exclude: ["teacherId"] },
        where: {
          teacherId: {
            [Op.eq]: user.id,
          },
          template: true,
        },
        order: [["createdAt", "DESC"]],
        include: [
          {
            model: User,
            as: "teacher",
            attributes: ["name", "username", "id", "email", "role"],
          },
          {
            model: User,
            as: "students",
            attributes: ["name", "username", "id", "email", "role"],
            through: {
              attributes: [],
            },
          },
          {
            model: Chapter,
            as: "chapters",
            attributes: ["title", "id"],
            order: [["createdAt", "DESC"]],
            include: [
              {
                model: Section,
                as: "sections",
                order: [["createdAt", "DESC"]],
                include: [
                  {
                    model: File,
                    as: "files",
                    order: [["createdAt", "DESC"]],
                  },
                ],
              },
            ],
          },
        ],
      });
      return res.send(templates);
    }
  } catch (err) {
    return next(err);
  }
});

// To create template
router.post("/", tokenExtractor, async (req: CustomRequest, res, next) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).send("User not found");
    }
    if (user.role != "teacher") {
      return res
        .status(401)
        .send(
          "You don't have permissions to create templates. Contact support if you think this is a mistake."
        );
    }

    const template = await Course.create({
      title: req.body.title,
      description: req.body.description,
      teacherId: user.id, // Assign the user's ID to the course
      template: true,
      chapters: [],
    });
    return res.json(template);
  } catch (error) {
    // Handle any errors that occur
    return next(error);
  }
});

router.post(
  "/:id/buildcourse",
  tokenExtractor,
  async (req: CustomRequest, res, next) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).send("User not found");
      }
      if (user.role != "teacher") {
        return res
          .status(401)
          .send(
            "You don't have permissions to create templates. Contact support if you think this is a mistake."
          );
      }

      const copied = await sequelize.transaction(async (transaction) => {
        await sequelize.query("SELECT pg_advisory_xact_lock_shared(:key)", {
          replacements: { key: courseObjectLock }, transaction,
        });
        // find the template
        const template = await Course.findOne({
          transaction,
          where: { id: req.params.id },
          include: [
            {
              model: User,
              as: "teacher",
              attributes: ["name", "username", "id", "email", "role"],
            },
            {
              model: User,
              as: "students",
              attributes: ["name", "username", "id", "email", "role"],
              through: {
                attributes: [],
              },
            },
            {
              model: Chapter,
              as: "chapters",
              attributes: ["title", "id"],
              order: [["createdAt", "DESC"]],
              include: [
                {
                  model: Section,
                  as: "sections",
                  order: [["createdAt", "DESC"]],
                  include: [
                    {
                      model: File,
                      as: "files",
                      order: [["createdAt", "DESC"]],
                    },
                  ],
                },
              ],
            },
          ],
        });

        if (!template) {
          return res.status(404).send("Template not found");
        }

        const course = await Course.create({
          title: req.body.title ? req.body.title : template.title,
          description: req.body.description
            ? req.body.description
            : template.description,
          teacherId: user.id, // Assign the user's ID to the course
          template: false,
          chapters: [],
        }, { transaction });

        // to duplicate chapters
        for (const tempChapter of template.chapters) {
          const newChapter = await Chapter.create({
            title: tempChapter.title,
            sections: [],
            courseId: course.id,
          }, { transaction });

          // to duplicate sections
          for (const tempSection of tempChapter.sections) {
            const newSection = await Section.create({
              title: tempSection.title,
              files: [],
              chapterId: newChapter.id,
            }, { transaction });

            // to duplicate files
            for (const tempFile of tempSection.files) {
              await File.create({
                name: tempFile.name,
                link: tempFile.link,
                sectionId: newSection.id,
                awskey: tempFile.awskey,
                visibledate: tempFile.visibledate,
              }, { transaction });
            }
          }
        }

        return course;
      });
      if (!(copied instanceof Course)) return copied;
      return res.json(copied);
    } catch (error) {
      return next(error);
    }
  }
);

export default router;
