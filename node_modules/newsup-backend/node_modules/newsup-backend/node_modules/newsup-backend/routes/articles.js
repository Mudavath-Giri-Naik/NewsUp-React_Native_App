  const express = require('express');
  const router = express.Router();
  const mongoose = require('mongoose');

  // ✅ 1. Get full article by articleId
  // GET /api/articles/by-id/:paper/:articleId
  router.get("/by-id/:paper/:articleId", async (req, res) => {
    try {
      const { paper, articleId } = req.params;
      const db = mongoose.connection.useDb("DailyNews");
      const collection = db.collection(paper);

      // Fetch full article
      const article = await collection.findOne(
        { articleId: parseInt(articleId) }
      );

      if (!article) {
        return res.status(404).json({ error: "Article not found" });
      }

      res.json(article);
    } catch (error) {
      console.error("Error fetching article:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

 // ✅ 2. Get paginated and light articles for a given newspaper on a specific date (with examSpecific field)
router.get('/:paper/by-date/:date', async (req, res) => {
  try {
    const { paper, date } = req.params;
    const { page = 1, limit = 10 } = req.query; // pagination query params
    const db = mongoose.connection.useDb('DailyNews');
    const collection = db.collection(paper);

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const articles = await collection.find({ date: date })
      .project({ title: 1, date: 1, category: 1, articleId: 1, examSpecific: 1 }) // ✅ included examSpecific field
      .skip(skip)
      .limit(parseInt(limit))
      .toArray();

    if (!articles || articles.length === 0) {
      return res.status(404).json({ message: `No articles found for ${paper} on ${date}` });
    }

    // Optionally: ensure all articles have examSpecific, set to undefined if missing
    const finalArticles = articles.map(article => ({
      title: article.title,
      date: article.date,
      category: article.category,
      articleId: article.articleId,
      examSpecific: article.examSpecific !== undefined ? article.examSpecific : undefined
    }));

    res.json(finalArticles);
  } catch (error) {
    console.error(`Error fetching articles for ${paper} on ${date}:`, error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});


  module.exports = router;