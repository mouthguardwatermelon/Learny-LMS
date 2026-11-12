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
