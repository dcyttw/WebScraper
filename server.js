var express = require("express");
var bodyParser = require("body-parser");
var logger = require("morgan");
var mongoose = require("mongoose");

// Our scraping tools
// Require request and cheerio. This makes the scraping possible
var request = require("request");
var cheerio = require("cheerio");

// Require all models
var db = require("./models");

var PORT = process.env.PORT || 3000;

// Initialize Express
var app = express();

// Configure middleware
// Use morgan logger for logging requests
app.use(logger("dev"));
// Use body-parser for handling form submissions
app.use(bodyParser.urlencoded({ extended: true }));
// Use express.static to serve the public folder as a static directory
app.use(express.static("public"));

// Set Handlebars.
var exphbs = require("express-handlebars");
app.engine("handlebars", exphbs({ defaultLayout: "main" }));
app.set("view engine", "handlebars");

// Connect to the Mongo DB
// If deployed, use the deployed database. Otherwise use the local mongoHeadlines database
var MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/testScrape";
// Set mongoose to leverage built in JavaScript ES6 Promises
mongoose.Promise = Promise;
// Connect to the Mongo DB
mongoose.connect(MONGODB_URI);

// Routes
// A GET route for scraping the echoJS webiste: no duplicates.
app.get("/scrape", function(req, res) {
  // Grab every document in the Articles collection
  db.Article.find({})
    .then(function(dbArticle) {
      var count = 0;
      // First, we grab the body of the html with request
      request("http://www.echojs.com/", function(error, response, html) {
        // Then, we load that into cheerio and save it to $ for a shorthand selector
        var $ = cheerio.load(html);
        // Now, we grab every h2 within an article tag, and do the following:
        $("article h2").each(function(i, element) {
          // Save an empty result object
          var result = {};
          var title = $(this).children("a").text();
          var found = false;
          // loop tru Article
          for (var i = 0; i < dbArticle.length; i++) {
            var element = dbArticle[i];
            if (element.title === title) {
              found = true;
              break;
            }
          }
          if (found === false) {
            count++;
            // Add the text and href of every link, and save them as properties of the result object
            result.title = $(this)
              .children("a")
              .text();
            result.link = $(this)
              .children("a")
              .attr("href");
            // Create a new Article using the `result` object built from scraping
            db.Article.create(result)
              .then(function(dbArticle) {
                // View the added result in the console
                console.log(dbArticle);
              })
              .catch(function(err) {
                // If an error occurred, send it to the client
                return res.json(err);
              });
          }
        });
        console.log("New: " + count);
      });
      // If we were able to successfully scrape and save an Article, send a message to the client
      //res.send("Scrape Complete");
      res.redirect("/");
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Route for getting all saved Articles from the db
app.get("/saved", function(req, res) {
  // Grab every document in the Articles collection
  db.Article.find({ saved: true }).sort({ _id: -1 }) 
    .then(function(dbArticle) {
      // If we were able to successfully find Articles, send them back to the client
      //res.json(dbArticle);
      res.render("saved", { articles: dbArticle });
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Route for saving an Article
app.put("/saved/:id", function (req, res) {
  db.Article.findByIdAndUpdate({ _id: req.params.id }, { $set: { saved: true } }, { new: true }, function (err, data) {
  })
    .then(function(dbArticle) {
      // If we were able to successfully update an Article, send it back to the client
      //res.json(dbArticle);
      res.redirect("/");
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Route for getting all Articles from the db
app.get("/", function(req, res) {
  // Grab every document in the Articles collection
  db.Article.find({ saved: false }).sort({ _id: -1 }) 
    .then(function(dbArticle) {
      // If we were able to successfully find Articles, send them back to the client
      //res.json(dbArticle);
      res.render("index", { articles: dbArticle });
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Route for grabbing a specific Article by id, populate it with it's note
app.get("/articles/:id", function(req, res) {
  // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
  db.Article.findOne({ _id: req.params.id })
    // ..and populate all of the notes associated with it
    .populate("notes")
    .then(function(dbArticle) {
      // If we were able to successfully find an Article with the given id, send it back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Route for saving/updating an Article's associated Note
app.post("/notes", function(req, res) {
  console.log(req.body.noteText);
  console.log(req.body._id);
  // Create a new note and pass the req.body to the entry
  db.Note.create({ body: req.body.noteText })
    .then(function(dbNote) {
      // If a Note was created successfully, find one Article with an `_id` equal to `req.params.id`. Update the Article to be associated with the new Note
      // { new: true } tells the query that we want it to return the updated User -- it returns the original by default
      // Since our mongoose query returns a promise, we can chain another `.then` which receives the result of the query
      console.log(dbNote);
      console.log(req.body._id);
      console.log(dbNote._id);
      return db.Article.findOneAndUpdate({ _id: req.body._id }, { $push: { notes: dbNote._id } }, { new: true });
    })
    .then(function(dbArticle) {
      // If we were able to successfully update an Article, send it back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Route for saving/updating an Article's associated Note
app.post("/notes/:id", function(req, res) {
  console.log(req.body.noteText);
  console.log(req.body._id);
  // Create a new note and pass the req.body to the entry
  db.Note.create({ body: req.body.noteText })
    .then(function(dbNote) {
      // If a Note was created successfully, find one Article with an `_id` equal to `req.params.id`. Update the Article to be associated with the new Note
      // { new: true } tells the query that we want it to return the updated User -- it returns the original by default
      // Since our mongoose query returns a promise, we can chain another `.then` which receives the result of the query
      console.log(dbNote);
      console.log(req.body._id);
      console.log(dbNote._id);
      return db.Article.findOneAndUpdate({ _id: req.body._id }, { $push: { notes: dbNote._id } }, { new: true });
    })
    .then(function(dbArticle) {
      // If we were able to successfully update an Article, send it back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Start the server
app.listen(PORT, function() {
  console.log("App running on port " + PORT + "!");
});
