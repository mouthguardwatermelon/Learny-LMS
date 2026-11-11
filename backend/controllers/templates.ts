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
        attributes: { exclude: ["teacherId", "registrationPasswordHash"] },
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

      // find the template
      const template = await Course.findOne({
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
      });

      // to duplicate chapters
      for (var i = 0; i < template.chapters.length; i++) {
        const tempChapter = template.chapters[i];
        const newChapter = await Chapter.create({
          title: tempChapter.title,
          sections: [],
          courseId: course.id,
        });

        // to duplicate sections
        for (var i = 0; i < tempChapter.sections.length; i++) {
          const tempSection = tempChapter.sections[i];
          const newSection = await Section.create({
            title: tempSection.title,
            files: [],
            chapterId: newChapter.id,
          });

          // to duplicate files
          for (var i = 0; i < tempSection.files.length; i++) {
            const tempFile = tempSection.files[i];
            const newFile = await File.create({
              name: tempFile.name,
              link: tempFile.link,
              sectionId: newSection.id,
              awskey: tempFile.awskey,
              visibledate: tempFile.visibledate,
            });
          }
        }
      }

      return res.json(course);
    } catch (error) {
      return next(error);
    }
  }
);

export default router;
