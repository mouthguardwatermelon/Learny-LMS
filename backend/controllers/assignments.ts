import { randomUUID } from "crypto";
import express from "express";
import {
  Section,
  File,
  Chapter,
  Assignment,
  Submission,
  Enrollment,
  User,
} from "../models";
import { Course } from "../models";
import { tokenExtractor } from "../utils/middleware";
import { CustomRequest } from "../types";
import AWS from "aws-sdk";
import dotenv from "dotenv";
const multer = require("multer");
import getUpdatedCourse from "../utils/getUpdatedCourse";
import { Op } from "sequelize";
import { assignmentSubmission } from "../utils/emails/notification/assignment_submission";

const router = express.Router();
dotenv.config();

// configure AWS details
AWS.config.update({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.ACCESS_KEY_ID,
  secretAccessKey: process.env.SECRET_ACCESS_KEY,
});
const s3 = new AWS.S3();

// configure multer with file validation
const storage = multer.memoryStorage();

// File filter to validate file types
const fileFilter = (req: any, file: any, cb: any) => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/gif'
  ];
  
  if (allowedTypes.indexOf(file.mimetype) !== -1) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, Word documents, text files, and images are allowed.'), false);
  }
};

const upload = multer({ 
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

router.get("/:id", tokenExtractor, async (req: CustomRequest, res, next) => {
  const user = req.user;
  if (!user) {
    return res.status(404).send("You need to be logged in");
  }
  const assignment =
    user.role === "student"
      ? await Assignment.findByPk(req.params.id, {
          include: [
            {
              model: Submission,
              as: "submissions",
              required: false,
              where: {
                studentId: {
                  [Op.eq]: user.id,
                },
              },
              include: [
                {
                  model: User,
                  as: "student",
                  attributes: ["name", "username", "id", "email", "role"],
                },
              ],
            },
          ],
        })
      : await Assignment.findByPk(req.params.id, {
          include: [
            {
              model: Submission,
              as: "submissions",
              required: false,
              include: [
                {
                  model: User,
                  as: "student",
                  attributes: ["name", "username", "id", "email", "role"],
                },
              ],
            },
          ],
        });
  if (!assignment) {
    return res.status(404).send("Assignment not found");
  }
  let section = await Section.findByPk(assignment?.sectionId);
  if (!section) {
    return res.status(404).send("Section not found");
  }
  let chapter = await Chapter.findByPk(section?.chapterId);
  let course = await Course.findByPk(chapter?.courseId);
  if (!course) {
    return res.status(404).send("Course missing.");
  }

  // check if user has permissions to access the assignment
  if (user.role === "student") {
    const check = await Enrollment.findOne({
      where: {
        userId: {
          [Op.eq]: user.id,
        },
        courseId: {
          [Op.eq]: course.id,
        },
      },
    });
    if (!check) {
      return res.status(403).send("No permissions to view assignment.");
    }
  }
  if (user.role === "teacher") {
    if (user.id !== course.teacherId) {
      return res.status(403).send("No permissions to view assignment.");
    }
  }

  return res.json(assignment);
});

// allowing students to submit their work to assignment
router.post(
  "/:id/submissions",
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
    const assignment = await Assignment.findByPk(req.params.id);
    if (!assignment) {
      return res.status(404).send("Assignment not found");
    }
    let section = await Section.findByPk(assignment?.sectionId);
    if (!section) {
      return res.status(404).send("Section not found");
    }
    let chapter = await Chapter.findByPk(section?.chapterId);
    let course = await Course.findByPk(chapter?.courseId);
    if (!course) {
      return res.status(404).send("Course missing.");
    }
    if (user.role !== "student") {
      return res
        .status(403)
        .send("Only students can submit work to assignments.");
    }
    let teacher = await User.findByPk(course.teacherId);
    if (!teacher) {
      return res
        .status(404)
        .send("Unknown error. Contact support. (Missing teacher to course)");
    }

    // check if user has permissions to access the assignment
    if (user.role === "student") {
      const check = await Enrollment.findOne({
        where: {
          userId: {
            [Op.eq]: user.id,
          },
          courseId: {
            [Op.eq]: course.id,
          },
        },
      });
      if (!check) {
        return res.status(403).send("No permissions to submit to assignment.");
      }
    }

    // check if current date & time is earlier than the deadline for submission
    if (assignment.deadline && new Date() > new Date(assignment.deadline)) {
      return res
        .status(400)
        .send("Deadline for submission to this assignment has passed.");
    }

    try {
      const fileName = req?.file.originalname;
      const fileData = req?.file.buffer;
      let link = "";
      let awskey = "";
      const bucketName = process.env.AWS_BUCKET_NAME;
      const dirName = `Assignment${assignment.id}/Submissions/`;

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
        res.status(500).send("Internal server error. Try again later.");
      }

      // check whether link and awskey are empty, before a file is created in database
      if (link.trim().length === 0 || awskey.trim().length === 0) {
        return res
          .status(500)
          .send(
            "Error initialising AWS keys and links. Contact support for more info."
          );
      }

      await Submission.create({
        submittedLink: link,
        studentId: user.id,
        assignmentId: assignment.id,
        submittedAwsKey: awskey,
      });

      // send email to student to notify that submission has been recorded
      assignmentSubmission(
        user.email,
        user.name,
        teacher?.email,
        teacher?.name,
        assignment.name,
        course.title
      );

      const editedAssignment = await Assignment.findByPk(req.params.id, {
        include: [
          {
            model: Submission,
            as: "submissions",
            required: false,
            where: {
              studentId: {
                [Op.eq]: user.id,
              },
            },
            include: [
              {
                model: User,
                as: "student",
                attributes: ["name", "username", "id", "email", "role"],
              },
            ],
          },
        ],
      });

      if (!editedAssignment) {
        return res.status(404).send("Assignment not found");
      }

      return res.json(editedAssignment);
    } catch (error) {
      next(error);
    }
  }
);

// edit assignment
router.put(
  "/:id",
  tokenExtractor,
  upload.single("file"),
  async (req: CustomRequest, res, next) => {
    const user = req.user;
    if (!user) {
      return res.status(404).send("You need to be logged in");
    }

    try {
      let assignment = await Assignment.findByPk(req.params.id);
      if (!assignment) {
        return res.status(404).send("Assignment not found");
      }
      let section = await Section.findByPk(assignment?.sectionId);
      let chapter = await Chapter.findByPk(section?.chapterId);
      let course = await Course.findByPk(chapter?.courseId);

      // check if user has permissions to edit assignment, only creator of the course can edit the assignment
      if (user.id.toString() !== course?.teacherId.toString()) {
        return res
          .status(403)
          .send(`You don't have permissions to edit this assignment`);
      }

      assignment.set(req.body, { attributes: ["name", "instructions", "visibledate", "deadline", "marks"] });
      await assignment.save();

      const editedCourse = await getUpdatedCourse(course.id);
      if (!editedCourse) {
        return res.status(404).send("Course not found");
      }

      return res.json(editedCourse);
    } catch (error) {
      return next(error);
    }
  }
);

router.delete("/:id", tokenExtractor, async (req: CustomRequest, res, next) => {
  const user = req.user; // to figure out details about the user (e.g. his token)
  if (!user) {
    return res.status(404).send("You need to be logged in");
  }
  try {
    let assignment = await Assignment.findByPk(req.params.id);
    if (!assignment) {
      return res.status(404).send("Assignment not found");
    }
    let section = await Section.findByPk(assignment?.sectionId);
    let chapter = await Chapter.findByPk(section?.chapterId);
    let course = await Course.findByPk(chapter?.courseId);

    // check if user has permissions to delete assignment, only creator of the course can delete the assignment
    if (user.id.toString() !== course?.teacherId.toString()) {
      return res
        .status(403)
        .send(`You don't have permissions to delete this assignment`);
    }

    await assignment.destroy();

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
