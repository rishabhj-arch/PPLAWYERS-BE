import db from "../config/db.js";
import fs from "fs";
import path from "path";

const getImageUrl = (req, filename) => {
  if (!filename) return null;
  return `${req.protocol}://${req.get("host")}/uploads/${filename}`;
};

export const createNews = async (req, res) => {
  try {
    const { name, date, title, tag, description } = req.body;
    const image = req.file ? req.file.filename : null;
    await db.query(
      "INSERT INTO insights_news (name, date, title, tag, description, image) VALUES (?, ?, ?, ?, ?, ?)",
      [name, date, title, tag, description, image]
    );
    res.status(201).json({
      message: "News created",
      news: {
        name,
        date,
        title,
        tag,
        description,
        imageUrl: getImageUrl(req, image),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getNews = async (req, res) => {
  try {
    let { page = 1, limit = 10 } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    const offset = (page - 1) * limit;

    const [[{ total }]] = await db.query(
      "SELECT COUNT(*) AS total FROM insights_news"
    );
    const [rows] = await db.query(
      "SELECT * FROM insights_news ORDER BY date DESC, id DESC LIMIT ? OFFSET ?",
      [limit, offset]
    );

    const newsWithUrls = rows.map((item) => ({
      ...item,
      imageUrl: `${req.protocol}://${req.get("host")}/uploads/${item.image}`,
    }));

    res.json({
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: newsWithUrls,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const deleteNews = async (req, res) => {
  try {
    const { id } = req.params;
    const [[existing]] = await db.query(
      "SELECT image FROM insights_news WHERE id = ?",
      [id]
    );
    if (existing && existing.image) {
      const imagePath = path.join("uploads", existing.image);
      if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    }
    await db.query("DELETE FROM insights_news WHERE id = ?", [id]);
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

export const updateNews = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, date, title, tag, description } = req.body;
    const image = req.file ? req.file.filename : null;

    const [[existing]] = await db.query(
      "SELECT * FROM insights_news WHERE id = ?",
      [id]
    );
    if (!existing) return res.status(404).json({ message: "News not found" });

    let imageToSave = existing.image;
    if (image) {
      if (existing.image) {
        const oldPath = path.join("uploads", existing.image);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      imageToSave = image;
    }

    await db.query(
      "UPDATE insights_news SET name = ?, date = ?, title = ?, tag = ?, description = ?, image = ? WHERE id = ?",
      [name, date, title, tag, description, imageToSave, id]
    );

    res.json({
      message: "News updated successfully",
      news: {
        name,
        date,
        title,
        tag,
        description,
        imageUrl: getImageUrl(req, imageToSave),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
