import express from "express";
import { QueryTypes } from "sequelize";
import { Course } from "../models";
import { CustomRequest } from "../types";
import { sequelize } from "../utils/db";
import { tokenExtractor } from "../utils/middleware";

const router = express.Router();

router.use("/:id", tokenExtractor, async (req: CustomRequest, res, next) => {
  try {
    if (!/^\d{1,10}$/.test(req.params.id) || Number(req.params.id) > 2147483647) {
      return res.sendStatus(404);
    }
    const course = await Course.findByPk(req.params.id);
    if (!course) return res.sendStatus(404);
    if (req.user?.role !== "teacher" || req.user.id !== course.teacherId) {
      return res.sendStatus(403);
    }
    return next();
  } catch (error) {
    return next(error);
  }
});

router.get("/:id/documents", async (req, res, next) => {
  try {
    const documents = await sequelize.query(
      "SELECT id, title, body FROM course_documents WHERE course_id = :course ORDER BY id",
      { replacements: { course: req.params.id }, type: QueryTypes.SELECT }
    );
    return res.json(documents);
  } catch (error) {
    return next(error);
  }
});

router.post("/:id/documents", async (req, res, next) => {
  const { id, title, body } = req.body;
  if (typeof title !== "string" || !title.trim() || title.length > 200 ||
      typeof body !== "string" || body.length > 50000 ||
      (id !== undefined && (!Number.isInteger(id) || id < 1 || id > 2147483647))) {
    return res.status(400).send("Enter a title and up to 50,000 characters of text");
  }
  try {
    const [rows] = await sequelize.query(
      id === undefined
        ? "INSERT INTO course_documents (course_id, title, body) VALUES (:course, :title, :body) RETURNING id, title, body"
        : "UPDATE course_documents SET title = :title, body = :body WHERE course_id = :course AND id = :id RETURNING id, title, body",
      { replacements: { course: req.params.id, title: title.trim(), body, id } }
    );
    if (!rows.length) return res.sendStatus(404);
    return res.status(id === undefined ? 201 : 200).json(rows[0]);
  } catch (error) {
    return next(error);
  }
});

router.delete("/:id/documents/:documentId", async (req, res, next) => {
  try {
    const [rows] = await sequelize.query(
      "DELETE FROM course_documents WHERE course_id = :course AND id::text = :id RETURNING id",
      { replacements: { course: req.params.id, id: req.params.documentId } }
    );
    return res.sendStatus(rows.length ? 204 : 404);
  } catch (error) {
    return next(error);
  }
});

export default router;
