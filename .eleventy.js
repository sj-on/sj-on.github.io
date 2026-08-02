module.exports = function (eleventyConfig) {
  // Copy the `src/assets` folder to `_site/assets` so CSS and JS are available
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  // Copy CNAME
  eleventyConfig.addPassthroughCopy("src/CNAME");
  // Publish the app's generated cards.json at the site root, so the
  // Capacitor app can fetch live card data instead of only ever showing
  // whatever was bundled into it at build time. Requires
  // `node scripts/build-cards-json.mjs` to have run before this build —
  // see .github/workflows/deploy-pages.yml.
  eleventyConfig.addPassthroughCopy({ "app/www/cards.json": "cards.json" });

  // Create a `cards` collection from files in `src/cards` and sort by `number` frontmatter
  eleventyConfig.addCollection("cards", function(collectionApi) {
    return collectionApi.getFilteredByGlob("src/cards/*.md").sort(function(a,b){
      const na = (a.data && a.data.number) || 0;
      const nb = (b.data && b.data.number) || 0;
      return nb - na;
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
