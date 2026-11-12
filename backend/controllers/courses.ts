import express from "express";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import {
  Section,
  User,
  File,
  Chapter,
  Assignment,
  Submission,
  Announcement,
} from "../models";
import { Course } from "../models";
import { tokenExtractor } from "../utils/middleware";
import { CustomRequest } from "../types";
import { Op } from "sequelize";
import getUpdatedCourse from "../utils/getUpdatedCourse";
import { getCoursesByRole, getOneCourseByRole } from "../utils/courseFetching";

const router = express.Router();

// To get courses
router.get("/", tokenExtractor, async (req: CustomRequest, res, next) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(404).send("User not found");
    }
    const courses = await getCoursesByRole(user);
    return res.send(courses);
  } catch (err) {
    return next(err);
  }
});

// To get one course
router.get("/:id", tokenExtractor, async (req: CustomRequest, res, next) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(404).send("User not found");
    }
    const courseId = req.params.id;
    const course = await getOneCourseByRole(user, Number(courseId));
    return res.send(course);
  } catch (err) {
    return next(err);
  }
});
// To create a brand new and empty course without any chapters
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
          "You don't have permissions to create courses. Contact support if you think this is a mistake."
        );
    }

    const course = await Course.create({
      title: req.body.title,
      description: req.body.description,
      teacherId: user.id, // Assign the user's ID to the course
      template: false, // to certify this is a live course, not a template
      chapters: [],
    });
    return res.json(course);
  } catch (error) {
    // Handle any errors that occur
    return next(error);
  }
});

// To update details of the course
router.put("/:id", tokenExtractor, async (req: CustomRequest, res, next) => {
  const user = req.user;
  let course = await Course.findByPk(req.params.id);
  if (!user) {
    return res.status(404).send("User not found");
  }
  if (!course) {
    return res.status(404).send("Course not found");
  }
  // to ensure only creator of course can edit it
  if (user.id.toString() !== course.teacherId.toString()) {
    return res.status(401).send("No permissions to edit course");
  }
  const { title, description, zoomName } = req.body;
  if (title !== undefined) course.set("title", title);
  if (description !== undefined) course.set("description", description);
  if (zoomName !== undefined) course.set("zoomName", zoomName);
  try {
    await course.save();
    const editedCourse = await getUpdatedCourse(course.id);
    if (!editedCourse) {
      return res.status(404).send("Course not found");
    }
    return res.json(editedCourse);
  } catch (error) {
    return next(error);
  }
});

router.post("/:id/registration-password", tokenExtractor, async (req: CustomRequest, res, next) => {
  try {
    const course = await Course.findByPk(req.params.id);
    if (!course) return res.status(404).send("Course not found");
    if (req.user?.id !== course.teacherId) {
      return res.status(403).send("Only the course owner can create a registration password");
    }

    const password = randomBytes(18).toString("base64url");
    await course.update({ registrationPasswordHash: await bcrypt.hash(password, 10) });
    return res.set("Cache-Control", "no-store").json({ password });
  } catch (error) {
    return next(error);
  }
});

// To delete course
router.delete("/:id", tokenExtractor, async (req: CustomRequest, res, next) => {
  const user = req.user;
  let course = await Course.findByPk(req.params.id);
  if (!user) {
    return res.status(404).send("User not found");
  }
  if (!course) {
    return res.status(404).send("Course not found");
  }
  if (user.id.toString() !== course.teacherId.toString()) {
    return res.status(401).send("No permissions to delete course");
  }

  try {
    await course.destroy();
    res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

// To create chapters for a course
router.post(
  "/:id/chapters",
  tokenExtractor,
  async (req: CustomRequest, res, next) => {
    const user = req.user;
    if (!user) {
      return res.status(404).send("You need to be logged in");
    }
    try {
      let course = await Course.findByPk(req.params.id);
      if (!course) {
        return res.status(404).send("Course not found");
      }
      if (user.id.toString() !== course.teacherId.toString()) {
        return res
          .status(403)
          .send(`You don't have permissions to create chapters`);
      }

      await Chapter.create({
        title: req.body.title,
        sections: [],
        courseId: course.id,
        pinned: req.body.pinned,
      });

      const editedCourse = await getUpdatedCourse(course.id);
      if (!editedCourse) {
        return res.status(404).send("Course not found");
      }
      return res.json(editedCourse);
    } catch (err) {
      return next(err);
    }
  }
);

router.post(
  "/:id/announcements",
  tokenExtractor,
  async (req: CustomRequest, res, next) => {
    const user = req.user;
    if (!user) {
      return res.status(404).send("You need to be logged in");
    }
    try {
      let course = await Course.findByPk(req.params.id);
      if (!course) {
        return res.status(404).send("Course not found");
      }
      if (user.id.toString() !== course.teacherId.toString()) {
        return res
          .status(403)
          .send(
            `You don't have permissions to create announcements for this course.`
          );
      }

      await Announcement.create({
        title: req.body.title,
        message: req.body.message,
        courseId: course.id,
        expiry: req.body.expiry,
      });

      const editedCourse = await getUpdatedCourse(course.id);
      if (!editedCourse) {
        return res.status(404).send("Course not found");
      }
      return res.json(editedCourse);
    } catch (err) {
      return next(err);
    }
  }
);

export default router;
