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

// ✅ 2. Get paginated and light articles for a given newspaper on a specific date
// GET /api/articles/:paper/by-date/:date?page=1&limit=10
router.get('/:paper/by-date/:date', async (req, res) => {
  try {
    const { paper, date } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const db = mongoose.connection.useDb('DailyNews');
    const collection = db.collection(paper);

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const rawArticles = await collection.find({ date: date })
      .skip(skip)
      .limit(parseInt(limit))
      .toArray();

    if (!rawArticles || rawArticles.length === 0) {
      return res.status(404).json({ message: `No articles found for ${paper} on ${date}` });
    }

    const articles = rawArticles.map(article => {
      let finalTitle = article.title?.trim();

      // If title is missing or very short, try to fallback from deepAnalysisJson or summaryPointsJson
      if (!finalTitle || finalTitle.length < 5) {
        if (article.deepAnalysisJson?.title) {
          finalTitle = article.deepAnalysisJson.title.trim();
        } else if (article.summaryPointsJson?.title) {
          finalTitle = article.summaryPointsJson.title.trim();
        } else {
          finalTitle = 'Untitled Article'; // Fallback if nothing is available
        }
      }

      if (article.examSpecific === true) {
        return {
          articleId: article.articleId,
          date: article.date,
          category: article.category,
          title: finalTitle,
          examSpecific: article.examSpecific,
          deepAnalysisJson: article.deepAnalysisJson,
          summaryPointsJson: article.summaryPointsJson,
        };
      } else {
        return {
          articleId: article.articleId,
          date: article.date,
          category: article.category,
          examSpecific: article.examSpecific,
          title: finalTitle,
          involvement: article.involvement,
          past: article.past,
          present: article.present,
          points: article.points,
          glossary: article.glossary,
        };
      }
    });

    res.json(articles);
  } catch (error) {
    console.error(`Error fetching articles for ${paper} on ${date}:`, error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});




module.exports = router;
