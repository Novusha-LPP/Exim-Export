import express from "express";
import UserModel from "../model/userModel.mjs";

const router = express.Router();

router.get("/api/get-all-users", async (req, res) => {
  const users = await UserModel.find({});
  res.send(users);
});

export default router;
