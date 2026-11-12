import express from "express";
import User from "../models/user";
import { Course, Enrollment } from "../models";
import { QueryTypes } from "sequelize";
import getUpdatedCourse from "../utils/getUpdatedCourse";
import { tokenExtractor } from "../utils/middleware";
import { CustomRequest } from "../types";
import Blacklistedtoken from "../models/blacklistedtoken";
const bcrypt = require("bcryptjs");

import { sequelize } from "../utils/db";

const router = express.Router();

function accountProfile(user: User) {
  return { name: user.name, username: user.username, email: user.email, role: user.role };
}

router.get("/me", tokenExtractor, (req: CustomRequest, res) => {
  if (!req.user) return res.sendStatus(401);
  return res.json(accountProfile(req.user));
});

router.put("/me/settings", tokenExtractor, async (req: CustomRequest, res, next) => {
  const user = req.user;
  if (!user) return res.sendStatus(401);
  const { email, currentPassword, newPassword } = req.body;
  if (typeof currentPassword !== "string" || !currentPassword || Buffer.byteLength(currentPassword) > 72 ||
      typeof email !== "string" || !email.trim() || email.length > 254 ||
      (newPassword !== undefined && (typeof newPassword !== "string" ||
        newPassword.length < 8 || Buffer.byteLength(newPassword) > 72))) {
    return res.status(400).send("Enter a valid email and current password. New passwords require 8 characters and at most 72 bytes.");
  }

  try {
    const updated = await sequelize.transaction(async (transaction) => {
      const account = await User.findByPk(user.id, { lock: transaction.LOCK.UPDATE, transaction });
      if (!account || account.disabled || account.authVersion !== user.authVersion ||
          !(await bcrypt.compare(currentPassword, account.passwordHash))) return null;
      account.email = email.trim();
      if (newPassword !== undefined) {
        account.passwordHash = await bcrypt.hash(newPassword, 10);
        account.authVersion += 1;
      }
      await account.save({ transaction });
      return accountProfile(account);
    });
    if (!updated) return res.status(403).send("The current password is incorrect or your session has expired.");
    return res.json(updated);
  } catch (error) {
    return next(error);
  }
});

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
  const courseId = req.params.id;
  console.log(courseId);
  const course = await Course.findByPk(courseId);
  if (!course) {
    return res.status(404).send("Course not found");
  }

  // Creating user first
  const { username, name, password, email } = req.body;

  const saltRounds = 10;
  try {
    const passwordHash = await bcrypt.hash(password, saltRounds);
    const user = await User.create({
      username: username,
      name: name,
      passwordHash: passwordHash,
      role: "student",
      email: email,
    });

    // Now, to add the student to the course
    console.log(user);

    const userId = user.id;
    const courseIdNum = course.id;

    // Use Sequelize's built-in create method instead of raw SQL
    await Enrollment.create({
      userId: userId,
      courseId: courseIdNum,
    });

    const editedCourse = await getUpdatedCourse(course.id);
    if (!editedCourse) {
      return res.status(404).send("Course not found");
    }
    return res.json(editedCourse);
  } catch (error) {
    next(error);
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
