import express, { json } from "express";
import { v4 as uuidv4 } from "uuid";
import logger from "../loggingMiddleware/logger.js";

const app = express();
app.use(json());
app.use(logger); 

const urlDatabase = new Map();
const statsDatabase = new Map();

app.post("/shorturls", (req, res) => {
    const { url, validity = 30, shortcode } = req.body;
  
    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "Invalid URL" });
    }
  
    const code = shortcode || uuidv4().slice(0, 6);
    const expiry = new Date(Date.now() + validity * 30000); 
  
    if (urlDatabase.has(code)) {
      return res.status(409).json({ error: "Shortcode already exists" });
    }
  
    urlDatabase.set(code, {
      originalUrl: url,
      expiry,
      createdAt: new Date(),
    });
    statsDatabase.set(code, []);
  
    res.status(201).json({
      shortLink: `http://localhost:3000/shorturls/${code}`,
      expiry,
    });
  });
  

app.get("/shorturls/:shortcode", (req, res) => {
  const code = req.params.shortcode;
  const entry = urlDatabase.get(code);

  if (!entry) {
    return res.status(404).json({ error: "Shortcode not found" });
  }

  if (new Date() > new Date(entry.expiry)) {
    return res.status(410).json({ error: "Shortcode expired" });
  }

  statsDatabase.get(code).push({
    timestamp: new Date(),
    referrer: req.get("Referrer") || "Unknown",
    ip: req.ip,
  });

  res.redirect(entry.originalUrl);
});

app.get("/shorturls/stats/:shortcode", (req, res) => {
  const code = req.params.shortcode;
  const entry = urlDatabase.get(code);
  const stats = statsDatabase.get(code);

  if (!entry) {
    return res.status(404).json({ error: "Shortcode not found" });
  }

  res.json({
    originalUrl: entry.originalUrl,
    createdAt: entry.createdAt,
    expiry: entry.expiry,
    totalClicks: stats.length,
    clicks: stats,
  });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`URL Shortener running on port ${PORT}`);
});
