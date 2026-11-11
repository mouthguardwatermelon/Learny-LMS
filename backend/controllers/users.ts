import express from "express";
import User from "../models/user";
import { Course, Enrollment } from "../models";
import { QueryTypes } from "sequelize";
import { sequelize } from "../utils/db";
import { tokenExtractor } from "../utils/middleware";
import { CustomRequest } from "../types";
import Blacklistedtoken from "../models/blacklistedtoken";
const bcrypt = require("bcryptjs");

const router = express.Router();

router.get("/", tokenExtractor, async (req: CustomRequest, res) => {
  const user = req.user;
  if (!user) {
    return res.status(404).send("User not found");
  }
  if (user.role !== "admin") {
    return res.status(403).send("Unauthorized to view this page.");
  }
  const users = await User.findAll({});
  res.json(users);
});

router.post("/", async (req, res, next) => {
  const { username, name, password, role, email } = req.body;
  const saltRounds = 10;
  if (role === "admin") {
    return res.status(400).send("Unauthorized to create admin accounts.");
  }
  try {
    const passwordHash = await bcrypt.hash(password, saltRounds);
    const user = await User.create({
      username: username,
      name: name,
      passwordHash: passwordHash,
      role: role,
      email: email,
    });
    res.json(user);
  } catch (error) {
    next(error);
  }
});

router.put(
  "/change-password",
  tokenExtractor,
  async (req: CustomRequest, res, next) => {
    const { oldPassword, newPassword } = req.body;
    const user = req.user;
    if (!user) {
      return res.status(404).send("User not found");
    }

    try {
      const passwordMatch = await bcrypt.compare(
        oldPassword,
        user.passwordHash
      );

      if (!passwordMatch) {
        return res.status(401).send("Old password does not match");
      }

      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(newPassword, saltRounds);

      user.passwordHash = passwordHash;
      await user.save();

      res.json({ message: "Password updated successfully" });
    } catch (error) {
      next(error);
    }
  }
);

// route where admins can change password for user accounts
router.put(
  "/:id/changepwd",
  tokenExtractor,
  async (req: CustomRequest, res, next) => {
    const admin = req.user;
    if (!admin) {
      return res.status(404).send("Log in is required to perform this action.");
    }
    if (admin.role !== "admin") {
      return res.status(403).send("Unauthorized to do this action.");
    }
    const { password } = req.body;
    const saltRounds = 10;
    try {
      const user = await User.findByPk(req.params.id);
      if (!user) {
        return res.status(404).send("User not found");
      }
      const passwordHash = await bcrypt.hash(password, saltRounds);
      user.passwordHash = passwordHash;
      await user.save();
      res.json(user);
    } catch (error) {
      next(error);
    }
  }
);

router.get("/:id", tokenExtractor, async (req: CustomRequest, res) => {
  const user = req.user;
  if (!user) {
    return res.status(404).send("User not found");
  }
  if (user.role !== "admin") {
    return res.status(403).send("Unauthorized to view this page.");
  }
  const userToFind = await User.findByPk(req.params.id);
  if (userToFind) {
    res.json(userToFind);
  } else {
    res.status(404).end();
  }
});

// Function to allow users to sign up an account and join a course directly, perfect for teachers to send invite links to students and they can create their accounts and join the course instantly.

router.post("/directsignup/:id", async (req, res, next) => {
  const { username, name, password, email, registrationPassword } = req.body;
  if (typeof registrationPassword !== "string" || !/^[A-Za-z0-9_-]{24}$/.test(registrationPassword)) {
    return res.status(403).send("Invalid course registration password");
  }
  if (typeof password !== "string" || password.length < 8 || Buffer.byteLength(password) > 72) {
    return res.status(400).send("Use a password of at least 8 characters and at most 72 bytes");
  }

  try {
    const course = await Course.unscoped().findByPk(req.params.id, {
      attributes: ["id", "template", "registrationPasswordHash"],
    });
    if (!course || course.get("template") === true || !course.registrationPasswordHash ||
        !(await bcrypt.compare(registrationPassword, course.registrationPasswordHash))) {
      return res.status(403).send("Invalid course registration password");
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await sequelize.transaction(async (transaction) => {
      const user = await User.create({ username, name, passwordHash, role: "student", email }, { transaction });
      await Enrollment.create({ userId: user.id, courseId: course.id }, { transaction });
    });
    return res.status(201).end();
  } catch (error) {
    return next(error);
  }
});

// route to delete users
router.delete("/:id", tokenExtractor, async (req: CustomRequest, res, next) => {
  const user = req.user;
  if (!user) {
    return res.status(404).send("User not found");
  }
  if (user.role !== "admin") {
    return res.status(403).send("Unauthorized to do this action.");
  }
  const userToDelete = await User.findByPk(req.params.id);
  if (userToDelete) {
    try {
      await userToDelete.destroy();
      const newUserList = await User.findAll({});
      res.json(newUserList);
    } catch (err) {
      next(err);
    }
  } else {
    res.status(404).end();
  }
});

// disabling a user
router.post(
  "/:id/disable",
  tokenExtractor,
  async (req: CustomRequest, res, next) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(404).send("User not found");
      }
      if (user.role !== "admin") {
        return res.status(403).send("Unauthorized to do this action.");
      }
      const userId = req.params.id;

      const userToDisable = await User.findByPk(userId);
      if (!userToDisable) {
        return res.status(404).send("User to disable not found");
      }

      await userToDisable.update({ disabled: true });

      const blacklistedtoken = {
        token: req.body.token,
      };

      await Blacklistedtoken.create(blacklistedtoken);

      res.send("User disabled and token blacklisted");
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/:id/enable",
  tokenExtractor,
  async (req: CustomRequest, res, next) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(404).send("User not found");
      }
      if (user.role !== "admin") {
        return res.status(403).send("Unauthorized to do this action.");
      }
      const userId = req.params.id;

      const userToEnable = await User.findByPk(userId);
      if (!userToEnable) {
        return res.status(404).send("User to enable not found");
      }

      await userToEnable.update({ disabled: false });

      res.send("User enabled");
    } catch (err) {
      next(err);
    }
  }
);

export default router;
