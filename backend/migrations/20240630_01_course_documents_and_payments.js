module.exports = {
  up: async ({ context }) => context.sequelize.transaction(async (transaction) => {
    await context.sequelize.query(`
      CREATE TABLE course_documents (
        id serial PRIMARY KEY,
        course_id integer NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        title text NOT NULL,
        body text NOT NULL
      );
      CREATE INDEX course_documents_course ON course_documents(course_id);
      CREATE TABLE tuition_payments (
        course_id integer NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        student_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        month date NOT NULL,
        PRIMARY KEY (course_id, student_id, month)
      );
    `, { transaction });
  }),

  down: async ({ context }) => {
    await context.sequelize.query("DROP TABLE tuition_payments, course_documents");
  },
};
