import db from "../config/db.js";
import fs from "fs";
import path from "path";


const BASE_URL = process.env.BASE_URL || "http://localhost:5000";

const getImageUrl = (req, filename) => {
  if (!filename) return null;
  return `${BASE_URL}/uploads/${filename}`;
};

const parseTags = (tag) => {
  if (!tag) return [];
  if (Array.isArray(tag)) return tag;
  try {
    return JSON.parse(tag);
  } catch {
    return String(tag)
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  }
};

export const createNews = async (req, res, next) => {
  try {
    const { name, date, title, tag, description } = req.body;
    const image = req.file ? req.file.filename : null;

    const errors = {};

    if (!name || typeof name !== "string" || !name.trim()) {
      errors.name = "Name is required";
    }

    if (!date) {
      errors.date = "Date is required";
    }

    if (!title || typeof title !== "string" || !title.trim()) {
      errors.title = "Title is required";
    }

    const parsedTags = parseTags(tag);
    if (!parsedTags || parsedTags.length === 0) {
      errors.tag = "At least one tag is required";
    }

    const descText = description
      ? String(description).replace(/<[^>]+>/g, "").trim()
      : "";
    if (!descText) {
      errors.description = "Description is required";
    }

    if (!image) {
      errors.image = "Image is required";
    }

    if (Object.keys(errors).length > 0) {
      if (image) {
        const imagePath = path.join("uploads", image);
        if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
      }
      return res.status(400).json({ message: "Validation failed", errors });
    }

    await db.query(
      "INSERT INTO insights_news (name, date, title, tag, description, image) VALUES (?, ?, ?, ?, ?, ?)",
      [name, date, title, JSON.stringify(parsedTags), description, image]
    );
    res.status(201).json({
      message: "News created successfully",
      news: {
        name,
        date,
        title,
        tag: parsedTags,
        description,
        imageUrl: getImageUrl(req, image),
      },
    });
  } catch (err) {
    console.error("Error in createNews:", err);
    next(err);
  }
};

export const getNews = async (req, res, next) => {
  try {
    let { page = 1, limit = 10, search = "" } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    const offset = (page - 1) * limit;

    let countQuery = "SELECT COUNT(*) AS total FROM insights_news";
    let dataQuery = "SELECT * FROM insights_news";
    let queryParams = [];

    if (search && search.trim() !== "") {
      const searchTerm = `%${search.trim()}%`;
      const searchCondition = " WHERE name LIKE ? OR title LIKE ? OR tag LIKE ? OR description LIKE ?";
      countQuery += searchCondition;
      dataQuery += searchCondition;
      queryParams = [searchTerm, searchTerm, searchTerm, searchTerm];
    }

    const [[{ total }]] = await db.query(countQuery, queryParams);

    dataQuery += " ORDER BY date DESC, id DESC LIMIT ? OFFSET ?";
    const [rows] = await db.query(dataQuery, [...queryParams, limit, offset]);

    const newsWithUrls = rows.map((item) => ({
      ...item,
      imageUrl: item.image ? `${BASE_URL}/uploads/${item.image}` : null,
    }));

    res.json({
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: newsWithUrls,
    });
  } catch (err) {
    console.error("Error in getNews:", err);
    next(err);
  }
};

export const deleteNews = async (req, res, next) => {
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
    console.error("Error in deleteNews:", err);
    next(err);
  }
};

export const updateNews = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, date, title, tag, description } = req.body;
    const image = req.file ? req.file.filename : null;

    const [[existing]] = await db.query(
      "SELECT * FROM insights_news WHERE id = ?",
      [id]
    );
    if (!existing) return res.status(404).json({ message: "News not found" });

    // Detailed validation for each field
    const errors = {};

    if (!name || typeof name !== "string" || !name.trim()) {
      errors.name = "Name is required";
    }

    if (!date) {
      errors.date = "Date is required";
    }

    if (!title || typeof title !== "string" || !title.trim()) {
      errors.title = "Title is required";
    }

    const parsedTags = parseTags(tag);
    if (!parsedTags || parsedTags.length === 0) {
      errors.tag = "At least one tag is required";
    }

    const descText = description
      ? String(description).replace(/<[^>]+>/g, "").trim()
      : "";
    if (!descText) {
      errors.description = "Description is required";
    }

    // If there are any errors, return them
    if (Object.keys(errors).length > 0) {
      if (image) {
        const imagePath = path.join("uploads", image);
        if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
      }
      return res.status(400).json({ message: "Validation failed", errors });
    }

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
      [name, date, title, JSON.stringify(parsedTags), description, imageToSave, id]
    );

    res.json({
      message: "News updated successfully",
      news: {
        name,
        date,
        title,
        tag: parsedTags,
        description,
        imageUrl: getImageUrl(req, imageToSave),
      },
    });
  } catch (err) {
    console.error("Error in updateNews:", err);
    next(err);
  }
};