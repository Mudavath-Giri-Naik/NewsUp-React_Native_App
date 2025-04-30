const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// ✅ 1. Get full article by articleId
// GET /api/articles/by-id/:paper/:articleId
router.get("/by-id/:paper/:articleId", async (req, res) => {
  try {
    const { paper, articleId } = req.params;
    const db = mongoose.connection.useDb("DailyNews"); // Uses DailyNews DB
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
    console.error("Error fetching article by ID:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ✅ Route 2: Get paginated articles - FIXED JSON PARSING
// GET /api/articles/:paper/by-date/:date
router.get('/:paper/by-date/:date', async (req, res) => {
  try {
    const { paper, date } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const db = mongoose.connection.useDb('DailyNews'); // Uses DailyNews DB
    const collection = db.collection(paper);

    const pageInt = parseInt(page);
    const limitInt = parseInt(limit);
    const skip = (pageInt - 1) * limitInt;

    // Fetch articles including fields needed for processing
    const articlesFromDb = await collection.find({ date: date })
      .project({
        title: 1,
        date: 1,
        category: 1,
        articleId: 1,
        examSpecific: 1,
        summaryPointsJson: 1 // Fetch the field
      })
      .skip(skip)
      .limit(limitInt)
      .toArray();

    if (!articlesFromDb || articlesFromDb.length === 0) {
      return res.status(404).json({ message: `No articles found for ${paper} on ${date}` });
    }

    // --- Process articles: Clean string, parse JSON, extract headings ---
    const processedArticles = articlesFromDb.map(article => {
      let syllabusHeadings = [];
      let summaryData = null; // Start with null
      const rawSummaryString = article.summaryPointsJson;

      // Check if we have a string to process
      if (rawSummaryString && typeof rawSummaryString === 'string') {
        let stringToParse = rawSummaryString.trim(); // Remove leading/trailing whitespace

        // --- *** NEW: Remove Markdown Code Fence *** ---
        const prefix = '```json';
        const suffix = '```';
        if (stringToParse.startsWith(prefix)) {
          stringToParse = stringToParse.substring(prefix.length); // Remove ```json
        }
        if (stringToParse.endsWith(suffix)) {
          stringToParse = stringToParse.substring(0, stringToParse.length - suffix.length); // Remove ```
        }
        stringToParse = stringToParse.trim(); // Trim again after removing fences
        // --- *** End Remove Fence *** ---

        // Now attempt to parse the cleaned string
        if (stringToParse) {
          try {
            summaryData = JSON.parse(stringToParse); // Parse the *cleaned* string
          } catch (parseError) {
            console.error(`Failed to parse JSON for articleId ${article.articleId} after cleaning: ${parseError.message}`);
            // Keep summaryData as null if parsing fails
          }
        }
      } else if (rawSummaryString && typeof rawSummaryString === 'object') {
         // It might already be a correct BSON object
         summaryData = rawSummaryString;
      }

      // Now, proceed only if summaryData is a valid object
      if (summaryData && typeof summaryData === 'object') {
        const syllabusItems = summaryData.InterconnectionsWithSyllabus;

        if (Array.isArray(syllabusItems)) {
          syllabusItems.forEach(item => {
            if (typeof item === 'string') {
              const match = item.match(/{{highlighted}}(.*?){{\/highlighted}}/);
              if (match && match[1]) {
                syllabusHeadings.push(match[1].trim());
              }
            }
          });
        }
      }

      // Construct the final article object
      return {
        title: article.title,
        date: article.date,
        category: article.category,
        articleId: article.articleId,
        examSpecific: article.examSpecific === undefined ? undefined : Boolean(article.examSpecific),
        syllabusHeadings: syllabusHeadings // Use the extracted headings (or empty array)
      };
    });
    // --- End processing ---

    res.json(processedArticles); // Send the processed articles

  } catch (error) {
    console.error(`Error fetching articles for ${paper} on ${date}:`, error.message, error.stack);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// ✅ NEW Route 3: Get Daily Resource Data by Date
// GET /api/articles/resources/daily/by-date/:date
// Assumes documents in 'Resources' DB, 'Daily' collection have a field named 'Date' (capitalized) matching the format of the :date parameter
router.get('/resources/daily/by-date/:date', async (req, res) => {
  try {
    const { date } = req.params;

    const db = mongoose.connection.useDb('Resources');
    const collection = db.collection('Daily');

    const dailyData = await collection.find({ Date: date })
      .project({ _id: 0 }) // Optional: specify only necessary fields
      .toArray();

    if (!dailyData || dailyData.length === 0) {
      return res.status(404).json({ message: `No daily resources found for date ${date}` });
    }

    res.json(dailyData);

  } catch (error) {
    console.error(`Error fetching daily resources for date ${date}:`, error);
    res.status(500).json({ error: 'Internal server error while fetching daily resources' });
  }
});

module.exports = router; // Export the router with all routes