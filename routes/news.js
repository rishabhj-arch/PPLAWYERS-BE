import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { verifyToken } from "../middleware/authMiddleware.js";
import {
  createNews,
  getNews,
  deleteNews,
  updateNews,
} from "../controllers/newsController.js";

const router = express.Router();

const uploadDir = "uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
  console.log("'uploads' folder created automatically");
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + path.extname(file.originalname);
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only images are allowed."));
  }
};

const upload = multer({ storage, fileFilter });

router.post("/news/create", verifyToken, upload.single("image"), createNews);
router.get("/news", verifyToken, getNews);
router.put("/news/:id", verifyToken, upload.single("image"), updateNews);
router.delete("/news/:id", verifyToken, deleteNews);

export default router;
