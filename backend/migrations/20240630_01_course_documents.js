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
    `, { transaction });
  }),

  down: async ({ context }) => {
    await context.sequelize.query("DROP TABLE course_documents");
  },
};
