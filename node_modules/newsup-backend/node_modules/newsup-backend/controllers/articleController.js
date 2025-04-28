// controllers/articleController.js
const mongoose = require("mongoose");

const categories = ["business", "entertainment", "politics", "sport", "tech"];

exports.getCategoriesCount = async (req, res) => {
  const { newspaper } = req.params;
  try {
    const collection = mongoose.connection.collection(newspaper);
    const result = await collection.aggregate([
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 }
        }
      }
    ]).toArray();

    // Fill in missing categories with 0
    const response = categories.map(cat => {
      const found = result.find(r => r._id === cat);
      return { category: cat, count: found ? found.count : 0 };
    });

    res.json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong." });
  }
};

exports.getTitlesByCategory = async (req, res) => {
  const { newspaper, category } = req.params;
  try {
    const collection = mongoose.connection.collection(newspaper);
    const titles = await collection.find({ category }).project({ title: 1, articleId: 1 }).toArray();
    res.json(titles);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong." });
  }
};

exports.getFullArticle = async (req, res) => {
  const { newspaper, articleId } = req.params;
  try {
    const collection = mongoose.connection.collection(newspaper);
    const article = await collection.findOne({ articleId: parseInt(articleId) });
    if (!article) return res.status(404).json({ error: "Article not found" });
    res.json(article);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong." });
  }
};
