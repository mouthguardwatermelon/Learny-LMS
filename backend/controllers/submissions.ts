import { randomUUID } from "crypto";
import express from "express";
import {
  Section,
  File,
  Chapter,
  Assignment,
  Submission,
  User,
} from "../models";
import { Course } from "../models";
import { tokenExtractor } from "../utils/middleware";
import { CustomRequest } from "../types";
import AWS from "aws-sdk";
import dotenv from "dotenv";
const multer = require("multer");
import getUpdatedCourse from "../utils/getUpdatedCourse";
import { markedSubmissionNotif } from "../utils/emails/notification/marked_submission";

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

// allowing teachers to grade students' submissions
router.put(
  "/:id/grade",
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
    const submission = await Submission.findByPk(req.params.id);
    if (!submission) {
      return res.status(404).send("Assignment not found");
    }
    let student = await User.findByPk(submission?.studentId);
    if (!student) {
      return res.status(404).send("Student not found");
    }

    let assignment = await Assignment.findByPk(submission?.assignmentId);
    if (!assignment) {
      return res.status(404).send("Section not found");
    }
    let section = await Section.findByPk(assignment?.sectionId);
    let chapter = await Chapter.findByPk(section?.chapterId);
    let course = await Course.findByPk(chapter?.courseId);
    if (!course) {
      return res.status(404).send("Course missing.");
    }
    if (user.id.toString() !== course.teacherId.toString()) {
      return res
        .status(401)
        .send("No permissions to mark submissions for this course.");
    }

    try {
      const fileName = req?.file.originalname;
      const fileData = req?.file.buffer;
      let link = "";
      let awskey = "";
      const bucketName = process.env.AWS_BUCKET_NAME;
      const dirName = `Assignment${assignment.id}/Submissions/Marked`;

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
      const markedSubmission = {
        ...submission,
        markedLink: link,
        markedAwsKey: awskey,
        score: req.body.score,
        grade: req.body.grade,
        comments: req.body.comments,
      };

      submission.set(markedSubmission);
      await submission.save();
      markedSubmissionNotif(
        student.email,
        student.name,
        assignment.name,
        course.title,
        assignment.id
      );

      const editedAssignment = await Assignment.findByPk(
        submission?.assignmentId,
        {
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
        }
      );

      if (!editedAssignment) {
        return res.status(404).send("Assignment not found");
      }

      return res.json(editedAssignment);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
