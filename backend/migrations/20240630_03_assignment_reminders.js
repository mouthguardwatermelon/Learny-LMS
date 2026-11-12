module.exports = {
  up: async ({ context }) => context.sequelize.transaction(async (transaction) => {
    await context.sequelize.query(`CREATE TABLE assignment_reminders (
  assignment_id integer NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  deadline timestamptz NOT NULL,
  PRIMARY KEY (assignment_id, student_id, deadline)
);`, { transaction });
  }),
  down: async ({ context }) => context.sequelize.transaction(async (transaction) => {
    await context.sequelize.query(`
      DROP TABLE assignment_reminders;
    `, { transaction });
  }),
};
