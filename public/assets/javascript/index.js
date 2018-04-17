/* gloabl bootbox */
$(document).ready(function() {
  // Setting a reference to the article-container div where all the dynamic content will go
  // Adding event listeners to any dynamically generated "save article"
  // and "scrape new article" buttons
  var articleContainer = $(".article-container");
  $(document).on("click", ".btn.save", handleArticleSave);
  $(document).on("click", ".scrape-new", handleArticleScrape);

  function handleArticleSave() {
    // This function is triggered when the user wants to save an article
    // When we rendered the article initially, we attatched a javascript object containing the headline id
    // to the element using the .data method. Here we retrieve that.
    var articleToSave = $(this).parents(".panel").attr("id");
    console.log(articleToSave);
    // Using a patch method to be semantic since this is an update to an existing record in our collection
    $.ajax({
      method: "PUT",
      url: "/saved/" + articleToSave
    }).then(function(data) {
      location.reload();
      // If successful, mongoose will send back an object containing a key of "ok" with the value of 1
      // (which casts to 'true')
      // if (data.ok) {
      //   // Run the initPage function again. This will reload the entire list of articles
      //   initPage();
      // }
    });
  }

  function handleArticleScrape() {
    // This function handles the user clicking any "scrape new article" buttons
    $.get("/scrape").then(function(data) {
      // If we are able to succesfully scrape the NYTIMES and compare the articles to those
      // already in our collection, re render the articles on the page
      // and let the user know how many unique articles we were able to save
      //initPage();
      bootbox.alert("<h3 class='text-center m-top-80'>" + data.message + "<h3>");
    });
  }
});
