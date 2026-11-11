import express from "express";
import { QueryTypes } from "sequelize";
import { Course, Enrollment } from "../models";
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

const validMonth = (month: string) => /^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(month);

router.get("/:id/payments/:month", async (req, res, next) => {
  if (!validMonth(req.params.month)) return res.sendStatus(400);
  try {
    const payments = await sequelize.query(
      "SELECT student_id AS \"studentId\" FROM tuition_payments WHERE course_id = :course AND month = :month",
      { replacements: { course: req.params.id, month: req.params.month + "-01" }, type: QueryTypes.SELECT }
    );
    return res.json(payments);
  } catch (error) {
    return next(error);
  }
});

router.put("/:id/payments/:month/:student", async (req, res, next) => {
  const { id, month, student } = req.params;
  if (!validMonth(month) || !/^\d{1,10}$/.test(student) || Number(student) > 2147483647 ||
      typeof req.body.paid !== "boolean") return res.sendStatus(400);

  try {
    const updated = await sequelize.transaction(async (transaction) => {
      const enrollment = await Enrollment.findOne({
        where: { courseId: id, userId: student },
        lock: transaction.LOCK.UPDATE,
        transaction,
      });
      if (!enrollment) return false;
      await sequelize.query(
        req.body.paid
          ? "INSERT INTO tuition_payments VALUES (:course, :student, :month) ON CONFLICT DO NOTHING"
          : "DELETE FROM tuition_payments WHERE course_id = :course AND student_id = :student AND month = :month",
        { replacements: { course: id, student, month: month + "-01" }, transaction }
      );
      return true;
    });
    return res.sendStatus(updated ? 204 : 404);
  } catch (error) {
    return next(error);
  }
});

export default router;
