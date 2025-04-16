const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Optional Mongoose model (for validation, fallback, etc.)
const Article = mongoose.model('Article', new mongoose.Schema({
  articleId: Number,
  title: String,
  description: String,
  points: String,
  glossary: Object,
  newspaper: String,
  category: String,
}));

// ✅ 1. Get category counts for a newspaper
// GET /api/articles/categories/:paper
router.get("/categories/:paper", async (req, res) => {
  try {
    const { paper } = req.params;
    const db = mongoose.connection.useDb("DailyNews");
    const collection = db.collection(paper);

    const categories = await collection.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } },
    ]).toArray();

    res.json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ✅ 2. Get article titles by newspaper and category
// GET /api/articles/titles/:paper/:category
router.get("/titles/:paper/:category", async (req, res) => {
  try {
    const { paper, category } = req.params;
    const db = mongoose.connection.useDb("DailyNews");
    const collection = db.collection(paper);

    const articles = await collection
      .find({ category })
      .project({ articleId: 1, title: 1, _id: 0 })
      .toArray();

    res.json(articles);
  } catch (error) {
    console.error("Error fetching article titles:", error);
    res.status(500).json({ error: "Failed to fetch article titles" });
  }
});

// ✅ 3. Get full article by articleId
// GET /api/articles/by-id/:paper/:articleId
router.get("/by-id/:paper/:articleId", async (req, res) => {
  try {
    const { paper, articleId } = req.params;
    const db = mongoose.connection.useDb("DailyNews");
    const collection = db.collection(paper);

    const article = await collection.findOne({ articleId: parseInt(articleId) });

    if (!article) {
      return res.status(404).json({ error: "Article not found" });
    }

    res.json(article);
  } catch (error) {
    console.error("Error fetching article:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
// ✅ 4. Get all articles for a newspaper (category = 'all')
// GET /api/articles/all/:paper
router.get("/all/:paper", async (req, res) => {
  try {
    const { paper } = req.params;
    const db = mongoose.connection.useDb("DailyNews");
    const collection = db.collection(paper);

    // When category is 'all', fetch all articles from the newspaper (regardless of category)
    const articles = await collection
      .find() // No category filter here
      .project({ articleId: 1, title: 1, _id: 0 }) // Only select articleId and title fields
      .toArray();

    if (!articles || articles.length === 0) {
      return res.status(404).json({ error: "No articles found" });
    }

    res.json(articles);
  } catch (error) {
    console.error("Error fetching articles:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
