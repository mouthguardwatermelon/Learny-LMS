import AWS from "aws-sdk";
import { QueryTypes } from "sequelize";
import { courseObjectLock, sequelize } from "./db";

async function removeUnreferencedObjects(s3: AWS.S3, bucket: string) {
  for (let index = 0; index < 25; index += 1) {
    const processed = await sequelize.transaction(async (transaction) => {
      await sequelize.query("SELECT pg_advisory_xact_lock(:key)", {
        replacements: { key: courseObjectLock }, transaction,
      });
      const [object] = await sequelize.query<{ object_key: string }>(`
        SELECT pending.object_key FROM s3_cleanup pending
        WHERE pending.retry_at <= now()
          AND NOT EXISTS (SELECT 1 FROM files f WHERE f.awskey = pending.object_key OR (pending.object_url <> '' AND f.link = pending.object_url))
          AND NOT EXISTS (SELECT 1 FROM assignments a WHERE a.awskey = pending.object_key OR (pending.object_url <> '' AND a.link = pending.object_url))
          AND NOT EXISTS (SELECT 1 FROM submissions s WHERE s.submitted_aws_key = pending.object_key
                          OR s.marked_aws_key = pending.object_key
                          OR (pending.object_url <> '' AND (s.submitted_link = pending.object_url
                              OR s.marked_link = pending.object_url)))
        ORDER BY pending.retry_at
        LIMIT 1 FOR UPDATE SKIP LOCKED
      `, { type: QueryTypes.SELECT, transaction });
      if (!object) return false;

      const replacements = { key: object.object_key };
      try {
        await s3.deleteObject({ Bucket: bucket, Key: object.object_key }).promise();
      } catch {
        await sequelize.query("UPDATE s3_cleanup SET retry_at = now() + interval '5 minutes' WHERE object_key = :key",
          { replacements, transaction });
        console.error("S3 cleanup failed; the object remains queued for retry.");
        return true;
      }
      await sequelize.query("DELETE FROM s3_cleanup WHERE object_key = :key", { replacements, transaction });
      return true;
    });
    if (!processed) break;
  }
}

export function startS3Cleanup() {
  const bucket = process.env.AWS_BUCKET_NAME;
  const s3 = new AWS.S3({ maxRetries: 1, httpOptions: { timeout: 10000, connectTimeout: 5000 } });
  let running = false;
  async function tick() {
    if (running) return;
    running = true;
    try {
      const results = await Promise.allSettled([
        bucket && removeUnreferencedObjects(s3, bucket),
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
