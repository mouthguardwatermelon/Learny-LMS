import { courseObjectLock, sequelize } from "../utils/db";
import express from "express";
import {
  Section,
  User,
  File,
  Chapter,
  Assignment,
  Submission,
} from "../models";
import { Course } from "../models";
import { nextTick } from "process";
import { tokenExtractor } from "../utils/middleware";
import { CustomRequest } from "../types";
import { Includeable } from "sequelize";
import { Op } from "sequelize";
import getUpdatedCourse from "../utils/getUpdatedCourse";

const router = express.Router();

// To create sections for a chapter of a course
router.post(
  "/:id/sections",
  tokenExtractor,
  async (req: CustomRequest, res, next) => {
    const user = req.user;
    if (!user) {
      return res.status(404).send("You need to be logged in");
    }

    try {
      let chapter = await Chapter.findByPk(req.params.id);
      if (!chapter) {
        return res.status(404).send("Chapter not found");
      }

      let course = await Course.findByPk(chapter.courseId);

      if (user.id.toString() !== course?.teacherId.toString()) {
        return res
          .status(403)
          .send(`You don't have permissions to create sections`);
      }

      await Section.create({
        title: req.body.title,
        files: [],
        chapterId: chapter.id,
      });

      const editedCourse = await getUpdatedCourse(course.id);
      if (!editedCourse) {
        return res.status(404).send("Course not found");
      }
      return res.json(editedCourse);
    } catch (error) {
      next(error);
    }
  }
);

// to edit the chapter
router.put("/:id", tokenExtractor, async (req: CustomRequest, res, next) => {
  const user = req.user;
  if (!user) {
    return res.status(404).send("You need to be logged in");
  }

  try {
    let chapter = await Chapter.findByPk(req.params.id);
    if (!chapter) {
      return res.status(404).send("Chapter not found");
    }
    let course = await Course.findByPk(chapter?.courseId);

    // check if user has permissions to edit file, only creator of the course can edit the file
    if (user.id.toString() !== course?.teacherId.toString()) {
      return res
        .status(403)
        .send(`You don't have permissions to edit this chapter`);
    }

    chapter.set(req.body);
    await chapter.save();
    const editedCourse = await getUpdatedCourse(course.id);
    if (!editedCourse) {
      return res.status(404).send("Course not found");
    }

    return res.json(editedCourse);
  } catch (error) {
    return next(error);
  }
});

// to delete the chapter

router.delete("/:id", tokenExtractor, async (req: CustomRequest, res, next) => {
  const user = req.user;
  if (!user) {
    return res.status(404).send("You need to be logged in");
  }
  try {
    let chapter = await Chapter.findByPk(req.params.id);
    if (!chapter) {
      return res.status(404).send("Chapter not found");
    }
    let course = await Course.findByPk(chapter.courseId);

    if (user.id.toString() !== course?.teacherId.toString()) {
      return res
        .status(403)
        .send(`You don't have permissions to delete this chapter`);
    }

    await chapter.destroy();

    // Display the edited course after the chapter is deleted
    const editedCourse = await getUpdatedCourse(course.id);
    if (!editedCourse) {
      return res.status(404).send("Course not found");
    }

    return res.json(editedCourse);
  } catch (err) {
    next(err);
  }
});

// To copy a chapter into another course
router.post(
  "/:id/copy",
  tokenExtractor,
  async (req: CustomRequest, res, next) => {
    const user = req.user;
    if (!user) {
      return res.status(404).send("You need to be logged in");
    }

    try {
      const copied = await sequelize.transaction(async (transaction) => {
        await sequelize.query("SELECT pg_advisory_xact_lock_shared(:key)", {
          replacements: { key: courseObjectLock }, transaction,
        });
        const originalChapter = await Chapter.findByPk(req.params.id, {
          transaction,
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
                },
              ],
            },
          ],
        });

        if (!originalChapter) {
          return res.status(404).send("Chapter not found");
        }

        const newCourseId = req.body.newCourseId;
        const newCourse = await Course.findByPk(newCourseId, { transaction });

        if (!newCourse) {
          return res.status(404).send("New course not found");
        }

        if (user.id.toString() !== newCourse.teacherId.toString()) {
          return res
            .status(403)
            .send(
              "You don't have permissions to copy this chapter to the specified course"
            );
        }

        const newChapter = await Chapter.create({
          title: originalChapter.title,
          pinned: false,
          courseId: newCourseId,
        }, { transaction });

        for (const section of originalChapter.sections) {
          const newSection = await Section.create({
            title: section.title,
            chapterId: newChapter.id,
          }, { transaction });

          for (const file of section.files) {
            await File.create({
              name: file.name,
              link: file.link,
              awskey: file.awskey,
              visibledate: file.visibledate,
              sectionId: newSection.id,
            }, { transaction });
          }

          for (const assignment of section.assignments) {
            await Assignment.create({
              name: assignment.name,
              link: assignment.link,
              sectionId: newSection.id,
              awskey: assignment.awskey,
              visibledate: new Date(),
              deadline: assignment.deadline,
              instructions: assignment.instructions,
              marks: assignment.marks,
            }, { transaction });
          }
        }

        return newCourse.id;
      });
      if (typeof copied !== "number") return copied;
      const editedCourse = await getUpdatedCourse(copied);
      if (!editedCourse) return res.status(404).send("Course not found");
      return res.json(editedCourse);
    } catch (error) {
      next(error);
    }
  }
);


export default router;
