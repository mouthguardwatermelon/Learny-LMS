import { randomUUID } from "crypto";
import express from "express";
import { Section, File, Chapter } from "../models";
import { Course } from "../models";
import { tokenExtractor } from "../utils/middleware";
import { CustomRequest } from "../types";
import AWS from "aws-sdk";
import dotenv from "dotenv";
const multer = require("multer");
import getUpdatedCourse from "../utils/getUpdatedCourse";
import Assignment from "../models/assignment";

const router = express.Router();
dotenv.config();

// configure AWS details
AWS.config.update({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.ACCESS_KEY_ID,
  secretAccessKey: process.env.SECRET_ACCESS_KEY,
});
const s3 = new AWS.S3();

// configure multer
const storage = multer.memoryStorage();
const upload = multer({ storage });

// To create files for a section of a course
router.post(
  "/:id/files",
  tokenExtractor,
  upload.single("file"),
  async (req: CustomRequest, res, next) => {
    const user = req.user;
    if (!user) {
      return res.status(404).send("You need to be logged in");
    }

    try {
      let section = await Section.findByPk(req.params.id);
      if (!section) {
        return res.status(404).send("Section not found");
      }
      let chapter = await Chapter.findByPk(section?.chapterId);
      let course = await Course.findByPk(chapter?.courseId);

      if (user.id.toString() !== course?.teacherId.toString()) {
        return res
          .status(403)
          .send(`You don't have permissions to create files`);
      }

      // for files that do not require AWS storage, e.g. stored on google drive or zoom meeting links etc.
      if (req.body.link) {
        await File.create({
          name: req.body.name,
          link: req.body.link,
          sectionId: section.id,
          visibledate: req.body.visibledate,
        });

        const editedCourse = await getUpdatedCourse(course.id);
        if (!editedCourse) {
          return res.status(404).send("Course not found");
        }

        return res.json(editedCourse);
      }

      if (!req.file) {
        return res.status(400).send("File missing.");
      }

      const fileName = req?.file.originalname;
      const fileData = req?.file.buffer;
      let link = "";
      let awskey = "";
      const bucketName = process.env.AWS_BUCKET_NAME;
      const dirName = `Section${section.id}/Files/`;

      // Defining parameters for S3 file upload
      const params = {
        Key: dirName + randomUUID() + "-" + fileName,
        Body: fileData,
        Bucket: bucketName ? bucketName : "",
        ContentType: req?.file.mimetype,
      };
      // Upload the file to S3
      try {
        const data = await s3.upload(params).promise();
        link = data.Location;
        awskey = data.Key;
      } catch (err) {
        res.status(500).send("Internal server error");
      }

      // check whether link and awskey are empty, before a file is created in database
      if (link.trim().length === 0 || awskey.trim().length === 0) {
        return res
          .status(500)
          .send(
            "Error initialising AWS keys and links. Contact support for more info."
          );
      }

      await File.create({
        name: req.body.name,
        link: link,
        sectionId: section.id,
        awskey: awskey,
        visibledate: req.body.visibledate,
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

// To create assignments for a section of a course
router.post(
  "/:id/assignments",
  tokenExtractor,
  upload.single("file"),
  async (req: CustomRequest, res, next) => {
    const user = req.user;
    if (!user) {
      return res.status(404).send("You need to be logged in");
    }
    if (!req.file) {
      return res.status(400).send("File missing.");
    }

    try {
      let section = await Section.findByPk(req.params.id);
      if (!section) {
        return res.status(404).send("Section not found");
      }
      let chapter = await Chapter.findByPk(section?.chapterId);
      let course = await Course.findByPk(chapter?.courseId);

      if (user.id.toString() !== course?.teacherId.toString()) {
        return res
          .status(403)
          .send(`You don't have permissions to create assignments`);
      }

      const fileName = req?.file.originalname;
      const fileData = req?.file.buffer;
      let link = "";
      let awskey = "";
      const bucketName = process.env.AWS_BUCKET_NAME;
      const dirName = `Section${section.id}/Assignments/`;

      // Defining parameters for S3 file upload
      const params = {
        Key: dirName + randomUUID() + "-" + fileName,
        Body: fileData,
        Bucket: bucketName ? bucketName : "",
        ContentType: req?.file.mimetype,
      };
      // Upload the file to S3
      try {
        const data = await s3.upload(params).promise();
        link = data.Location;
        awskey = data.Key;
      } catch (err) {
        return res.status(500).send("Internal server error");
      }

      // check whether link and awskey are empty, before a file is created in database
      if (link.trim().length === 0 || awskey.trim().length === 0) {
        return res
          .status(500)
          .send(
            "Error initialising AWS keys and links. Contact support for more info."
          );
      }

      await Assignment.create({
        name: req.body.name,
        link: link,
        sectionId: section.id,
        awskey: awskey,
        visibledate: req.body.visibledate,
        deadline: req.body.deadline,
        instructions: req.body.instructions,
        marks: req.body.marks,
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

// to edit a section
router.put("/:id", tokenExtractor, async (req: CustomRequest, res, next) => {
  const user = req.user;
  if (!user) {
    return res.status(404).send("You need to be logged in");
  }
  try {
    let section = await Section.findByPk(req.params.id);
    if (!section) {
      return res.status(404).send("Section not found");
    }
    let chapter = await Chapter.findByPk(section?.chapterId);
    let course = await Course.findByPk(chapter?.courseId);

    if (user.id.toString() !== course?.teacherId.toString()) {
      return res
        .status(403)
        .send(`You don't have permissions to edit this section`);
    }

    await section.update({
      title: req.body.title,
    });

    // Display the edited course after the chapter is deleted
    const editedCourse = await getUpdatedCourse(course.id);
    if (!editedCourse) {
      return res.status(404).send("Course not found");
    }

    return res.json(editedCourse);
  } catch (error) {
    next(error);
  }
});

// to delete a section

router.delete("/:id", tokenExtractor, async (req: CustomRequest, res, next) => {
  const user = req.user;
  if (!user) {
    return res.status(404).send("You need to be logged in");
  }
  try {
    let section = await Section.findByPk(req.params.id);
    if (!section) {
      return res.status(404).send("Section not found");
    }
    let chapter = await Chapter.findByPk(section?.chapterId);
    let course = await Course.findByPk(chapter?.courseId);

    if (user.id.toString() !== course?.teacherId.toString()) {
      return res
        .status(403)
        .send(`You don't have permissions to delete this section`);
    }

    await section.destroy();

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
