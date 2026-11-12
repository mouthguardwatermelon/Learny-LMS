import express from "express";
import { Section, User, File, Chapter } from "../models";
import { Course } from "../models";
import { nextTick } from "process";
import { tokenExtractor } from "../utils/middleware";
import { CustomRequest } from "../types";
import { Includeable } from "sequelize";
import { Op } from "sequelize";
import getUpdatedCourse from "../utils/getUpdatedCourse";

const router = express.Router();

// to edit details on the file
router.put("/:id", tokenExtractor, async (req: CustomRequest, res, next) => {
  const user = req.user; // to figure out details about the user (e.g. his token)
  if (!user) {
    return res.status(404).send("You need to be logged in");
  }

  try {
    let file = await File.findByPk(req.params.id);
    if (!file) {
      return res.status(404).send("File not found");
    }
    let section = await Section.findByPk(file?.sectionId);
    let chapter = await Chapter.findByPk(section?.chapterId);
    let course = await Course.findByPk(chapter?.courseId);

    // check if user has permissions to edit file, only creator of the course can edit the file
    if (user.id.toString() !== course?.teacherId.toString()) {
      return res
        .status(403)
        .send(`You don't have permissions to edit this file`);
    }

    file.set(req.body, { attributes: ["name", "visibledate"] });
    await file.save();
    const editedCourse = await getUpdatedCourse(course.id);
    if (!editedCourse) {
      return res.status(404).send("Course not found");
    }

    return res.json(editedCourse);
  } catch (error) {
    return next(error);
  }
});

// to delete the file
router.delete("/:id", tokenExtractor, async (req: CustomRequest, res, next) => {
  const user = req.user; // to figure out details about the user (e.g. his token)
  if (!user) {
    return res.status(404).send("You need to be logged in");
  }
  try {
    let file = await File.findByPk(req.params.id);
    if (!file) {
      return res.status(404).send("File not found");
    }
    let section = await Section.findByPk(file?.sectionId);
    let chapter = await Chapter.findByPk(section?.chapterId);
    let course = await Course.findByPk(chapter?.courseId);

    // check if user has permissions to delete file, only creator of the course can delete the file
    if (user.id.toString() !== course?.teacherId.toString()) {
      return res
        .status(403)
        .send(`You don't have permissions to delete this file`);
    }

    await file.destroy();

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

export default router;
