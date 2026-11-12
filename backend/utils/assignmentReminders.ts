import sgMail from "@sendgrid/mail";
import { QueryTypes } from "sequelize";
import { sequelize } from "./db";

interface Reminder {
  assignmentId: number;
  studentId: number;
  deadline: Date;
  name: string;
  title: string;
  email: string;
}

async function sendAssignmentReminders(from: string) {
  const reminders = await sequelize.query<Reminder>(`
    SELECT a.id AS "assignmentId", u.id AS "studentId", a.deadline,
           a.name, c.title, u.email
    FROM assignments a
    JOIN sections s ON s.id = a.section_id
    JOIN chapters ch ON ch.id = s.chapter_id
    JOIN courses c ON c.id = ch.course_id
    JOIN enrollments e ON e.course_id = c.id
    JOIN users u ON u.id = e.user_id
    WHERE a.deadline > now()
      AND a.deadline <= now() + interval '72 hours'
      AND a.visibledate <= now()
      AND c.template IS NOT TRUE
      AND u.role = 'student' AND u.disabled IS NOT TRUE
      AND NOT EXISTS (SELECT 1 FROM submissions x WHERE x.assignment_id = a.id AND x.student_id = u.id)
      AND NOT EXISTS (SELECT 1 FROM assignment_reminders r
                      WHERE r.assignment_id = a.id AND r.student_id = u.id AND r.deadline = a.deadline)
    ORDER BY a.deadline, a.id, u.id
    LIMIT 100
  `, { type: QueryTypes.SELECT });

  for (const reminder of reminders) {
    try {
      await sequelize.transaction(async (transaction) => {
        const [rows] = await sequelize.query(`
          INSERT INTO assignment_reminders (assignment_id, student_id, deadline)
          SELECT a.id, u.id, a.deadline
          FROM assignments a
          JOIN sections s ON s.id = a.section_id
          JOIN chapters ch ON ch.id = s.chapter_id
          JOIN enrollments e ON e.course_id = ch.course_id
          JOIN users u ON u.id = e.user_id
          WHERE a.id = :assignmentId AND u.id = :studentId AND a.deadline = :deadline
            AND a.deadline > now() AND a.visibledate <= now()
            AND u.role = 'student' AND u.disabled IS NOT TRUE
            AND NOT EXISTS (SELECT 1 FROM submissions x WHERE x.assignment_id = a.id AND x.student_id = u.id)
          ON CONFLICT DO NOTHING
          RETURNING assignment_id
        `, { replacements: { ...reminder }, transaction });
        if (!rows.length) return;

        await sgMail.send({
          from,
          to: reminder.email,
          subject: "Learny assignment reminder",
          text: reminder.name + " in " + reminder.title + " is due " +
            reminder.deadline.toISOString() + ". Sign in to Learny to submit your work.",
        });
      });
    } catch {
      console.error("Could not send an assignment reminder; it will be retried.");
    }
  }
}

export function startAssignmentReminders() {
  const sender = process.env.ASSIGNMENT_REMINDER_FROM;
  const sendgridKey = process.env.SENDGRID_SECRET;
  if (sender && sendgridKey) {
    sgMail.setApiKey(sendgridKey);
    sgMail.setTimeout(10000);
  }

  let running = false;
  async function tick() {
    if (running) return;
    running = true;
    try {
      const results = await Promise.allSettled([
        sender && sendgridKey && sendAssignmentReminders(sender),
      ]);
      for (const result of results) {
        if (result.status === "rejected") console.error("A Learny background job failed.");
      }
    } finally {
      running = false;
    }
  }
  void tick();
  setInterval(() => void tick(), 60_000).unref();
}
