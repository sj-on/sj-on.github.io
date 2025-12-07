module.exports = function (eleventyConfig) {
  // Copy the `src/assets` folder to `_site/assets` so CSS and JS are available
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });

  // Create a `cards` collection from files in `src/cards` and sort by `number` frontmatter
  eleventyConfig.addCollection("cards", function(collectionApi) {
    return collectionApi.getFilteredByGlob("src/cards/*.md").sort(function(a,b){
      const na = (a.data && a.data.number) || 0;
      const nb = (b.data && b.data.number) || 0;
      return na - nb;
    });
  });

  return {
    dir: {
      input: "src",
      includes: "_includes",
      layouts: "_includes",
      output: "_site"
    }
  };
};
