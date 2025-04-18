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

    // Fetch all articles with articleId and title
    const articles = await collection
      .find({}, { projection: { articleId: 1, title: 1, _id: 0 } })
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
// ✅ 5. Get secondCategory counts for a newspaper
// GET /api/articles/secondCategory/:paper
router.get("/secondCategory/:paper", async (req, res) => {
  try {
    const { paper } = req.params;
    const db = mongoose.connection.useDb("DailyNews");
    const collection = db.collection(paper);

    const secondCategory = await collection.aggregate([
      { $group: { _id: "$secondCategory", count: { $sum: 1 } } },
    ]).toArray();

    res.json(secondCategory);
  } catch (error) {
    console.error("Error fetching secondCategory:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});


// ✅ 6. Get article titles by newspaper and secondCategory value
// GET /api/articles/titles/:paper/secondCategory/:secondCategoryValue
router.get("/titles/:paper/secondCategory/:secondCategoryValue", async (req, res) => {
  try {
    const { paper, secondCategoryValue } = req.params;
    const db = mongoose.connection.useDb("DailyNews");
    const collection = db.collection(paper);

    const articles = await collection
      .find({ secondCategory: secondCategoryValue })
      .project({ articleId: 1, title: 1, _id: 0 })
      .toArray();

    res.json(articles);
  } catch (error) {
    console.error("Error fetching article titles by secondCategory:", error);
    res.status(500).json({ error: "Failed to fetch article titles" });
  }
});

// ✅ 7. Get secondCategory counts across all newspapers
// GET /api/articles/secondCategory/all
router.get('/secondCategory/all', async (req, res) => {
  try {
    const db = mongoose.connection.useDb('DailyNews');
    const papers = [
      'The Hindu',
      'Times of India',
      'Exam',
      'Hindustan Times',
      'Indian Express',
    ];

    const categoryCounts = {};

    for (const paper of papers) {
      try {
        const collection = db.collection(paper);

        const hasField = await collection.findOne({ secondCategory: { $exists: true } });
        if (!hasField) {
          console.log(`❌ Skipping ${paper} (no secondCategory)`);
          continue;
        }

        const results = await collection.aggregate([
          { $group: { _id: '$secondCategory', count: { $sum: 1 } } },
        ]).toArray();

        results.forEach(({ _id, count }) => {
          if (_id) {
            categoryCounts[_id] = (categoryCounts[_id] || 0) + count;
          }
        });

      } catch (error) {
        console.error(`Error processing ${paper}:`, error.message);
      }
    }

    // Convert to array format if needed
    const resultArray = Object.entries(categoryCounts).map(([category, count]) => ({
      secondCategory: category,
      count,
    }));

    res.json(resultArray);
  } catch (err) {
    console.error('Error fetching secondCategory:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// ✅ 8. Get article titles by secondCategory across all newspapers
// GET /api/articles/titles/secondCategory/:secondCategoryValue
// Debug version of: GET /api/articles/titles/secondCategory/all/:secondCategoryValue
router.get('/titles/secondCategory/all/:secondCategoryValue', async (req, res) => {
  try {
    const { secondCategoryValue } = req.params;
    const db = mongoose.connection.useDb('DailyNews');

    const papers = [
      'The Hindu',
      'Times of India',
      'Exam',
      'Hindustan Times',
      'Indian Express',
    ];

    const articles = [];

    for (const paper of papers) {
      try {
        const collection = db.collection(paper);

        const sample = await collection.findOne({}, { projection: { secondCategory: 1 } });
        console.log(`📄 ${paper} -> Sample secondCategory field:`, sample?.secondCategory);

        const hasField = await collection.findOne({ secondCategory: { $exists: true } });
        if (!hasField) {
          console.log(`❌ Skipping ${paper} (no secondCategory)`);
          continue;
        }

        const paperArticles = await collection
          .find({ secondCategory: secondCategoryValue })
          .project({ articleId: 1, title: 1, _id: 0 })
          .toArray();

        console.log(`✅ ${paper}: Found ${paperArticles.length} articles for ${secondCategoryValue}`);

        paperArticles.forEach((a) =>
          articles.push({
            articleId: a.articleId,
            title: a.title,
            newspaper: paper,
          })
        );
      } catch (error) {
        console.error(`Error processing ${paper}:`, error.message);
      }
    }

    res.json(articles);
  } catch (err) {
    console.error('Error fetching titles:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});






module.exports = router;
