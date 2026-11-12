import express, { Application } from "express";
import { startAssignmentReminders } from "./utils/assignmentReminders";
import { connectToDatabase } from "./utils/db";
import usersRouter from "./controllers/users";
import coursesRouter from "./controllers/courses";
import chaptersRouter from "./controllers/chapters";
import sectionsRouter from "./controllers/sections";
import filesRouter from "./controllers/files";
import loginRouter from "./controllers/login";
import enrollmentRouter from "./controllers/enrollment";
import templatesRouter from "./controllers/templates";
import recordingsRouter from "./controllers/recordings";
import assignmentsRouter from "./controllers/assignments";
import submissionsRouter from "./controllers/submissions";
import sessionsRouter from "./controllers/sessions";

import { PORT } from "./utils/config";

const { errorHandler } = require("./utils/middleware");

const app: Application = express();
app.use(express.json());
const cors = require("cors");

app.use(cors());

app.use("/api/courses", coursesRouter);
app.use("/api/templates", templatesRouter);
app.use("/api/chapters", chaptersRouter);
app.use("/api/sections", sectionsRouter);
app.use("/api/files", filesRouter);
app.use("/api/enrollment", enrollmentRouter);
app.use("/api/recordings", recordingsRouter);
app.use("/api/assignments", assignmentsRouter);
app.use("/api/submissions", submissionsRouter);
app.use("/api/sessions", sessionsRouter);

app.use("/api/users", usersRouter);
app.use("/api/login", loginRouter);

app.use(errorHandler);

app.listen(PORT, async () => {
  try {
    await connectToDatabase();
    startAssignmentReminders();
  } catch (err) {
    console.log(err);
  }

  console.log(`Server running on port ${PORT}`);
});
