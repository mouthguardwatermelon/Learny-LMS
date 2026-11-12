module.exports = {
  up: async ({ context }) => context.sequelize.transaction(async (transaction) => {
    await context.sequelize.query(`CREATE TABLE s3_cleanup (
  object_key text PRIMARY KEY,
  object_url text NOT NULL,
  retry_at timestamptz NOT NULL DEFAULT now()
);

CREATE FUNCTION enqueue_s3_cleanup() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  old_row jsonb := to_jsonb(OLD);
  new_row jsonb;
  key_field text;
  link_field text;
  object_key text;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    new_row := to_jsonb(NEW);
  END IF;
  FOREACH key_field IN ARRAY TG_ARGV LOOP
    object_key := old_row->>key_field;
    IF object_key IS NOT NULL AND object_key <> '' AND
       object_key IS DISTINCT FROM new_row->>key_field THEN
      link_field := CASE key_field
        WHEN 'submitted_aws_key' THEN 'submitted_link'
        WHEN 'marked_aws_key' THEN 'marked_link'
        ELSE 'link'
      END;
      INSERT INTO s3_cleanup (object_key, object_url)
        VALUES (object_key, coalesce(old_row->>link_field, ''))
        ON CONFLICT ON CONSTRAINT s3_cleanup_pkey DO UPDATE SET retry_at = now();
    END IF;
  END LOOP;
  RETURN NULL;
END;
$$;

CREATE TRIGGER files_s3_cleanup AFTER DELETE OR UPDATE OF awskey ON files
  FOR EACH ROW EXECUTE FUNCTION enqueue_s3_cleanup('awskey');
CREATE TRIGGER assignments_s3_cleanup AFTER DELETE OR UPDATE OF awskey ON assignments
  FOR EACH ROW EXECUTE FUNCTION enqueue_s3_cleanup('awskey');
CREATE TRIGGER submissions_s3_cleanup AFTER DELETE OR UPDATE OF submitted_aws_key, marked_aws_key ON submissions
  FOR EACH ROW EXECUTE FUNCTION enqueue_s3_cleanup('submitted_aws_key', 'marked_aws_key');
`, { transaction });
  }),
  down: async ({ context }) => context.sequelize.transaction(async (transaction) => {
    await context.sequelize.query(`
      DROP TRIGGER submissions_s3_cleanup ON submissions;
      DROP TRIGGER assignments_s3_cleanup ON assignments;
      DROP TRIGGER files_s3_cleanup ON files;
      DROP FUNCTION enqueue_s3_cleanup();
      DROP TABLE s3_cleanup;
    `, { transaction });
  }),
};
