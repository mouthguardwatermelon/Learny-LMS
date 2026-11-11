const jwt = require("jsonwebtoken");
import express from "express";
import { SECRET } from "../utils/config";
import User from "../models/user";
import Session from "../models/session";
const bcrypt = require("bcryptjs");

const router = express.Router();

router.post("/", async (request, response, next) => {
  try {
    const body = request.body;

    const user = await User.findOne({
      where: {
        username: body.username,
      },
    });

    const passwordCorrect =
      user === null
        ? false
        : await bcrypt.compare(body.password, user.passwordHash);

    if (!(user && passwordCorrect)) {
      return response.status(401).json({
        error: "invalid username or password",
      });
    }

    if (user.disabled) {
      return response
        .status(403)
        .send("User is disabled. Contact Admin for support.");
    }

    const userForToken = {
      username: user.username,
      id: user.id,
      authVersion: user.authVersion,
    };

    const token = jwt.sign(userForToken, SECRET, { expiresIn: '24h' });

    await Session.create({
      username: user.username,
      login_time: new Date(),
      token: token,
    });

    response
      .status(200)
      .send({
        token,
        username: user.username,
        name: user.name,
        role: user.role,
      });
  } catch (error) {
    next(error);
  }
});

export default router;
