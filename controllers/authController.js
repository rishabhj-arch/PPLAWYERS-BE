import jwt from "jsonwebtoken";
import db from "../config/db.js";
import dotenv from "dotenv";
import bcrypt from "bcrypt"; 

dotenv.config();
const SECRET_KEY = process.env.JWT_SECRET || "your_jwt_secret_key";

export const loginUser = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: "Email and password are required" });

  try {
    const [results] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
    if (results.length === 0)
      return res.status(401).json({ message: "Wrong email entered" });

    const user = results[0];
    
    const isPasswordValid = password === user.password;
    
    if (!isPasswordValid) 
      return res.status(401).json({ message: "Wrong password entered" });

    const token = jwt.sign({ id: user.id, email: user.email }, SECRET_KEY, { expiresIn: "1h" });
    await db.query("UPDATE users SET token = ? WHERE id = ?", [token, user.id]);

    res.json({
      message: "Login successful",
      token,
      redirect: "/insights_news"
    });
  } catch (err) {
    console.error(err); 
    res.status(500).json({ message: "Server error" });
  }
};