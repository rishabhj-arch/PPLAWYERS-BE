import React from "react";
import { Routes, Route } from "react-router-dom";
import SignInPage from "./pages/signin.js";
import InsightsNews from "./pages/insights_news.js";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<SignInPage />} />
      <Route path="/insights_news" element={<InsightsNews />} />
    </Routes>
  );
}
