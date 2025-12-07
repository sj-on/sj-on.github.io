# Oh No. The Truth Factory — 11ty Starter

This is a minimal Eleventy (11ty) project scaffold for your "Oh No. The Truth Factory!" card site.
Each card is a single Markdown file in `src/cards/`. Front (image + questions) is stored in frontmatter;
back (paragraphs + answers) is the markdown body (use `[answers]` to mark the answers section).

## Quick start (you need Node.js and npm)

1. Clone or download this repo and `cd` into it.
2. Run `npm install` to install Eleventy.
3. Run `npm run start` to start the dev server (eleventy --serve).
4. Build for production with `npm run build`.

## Project structure

- src/
  - _includes/
    - layouts/
      - card.njk        -> card layout that renders front & back and flip UI
    - partials/
      - header.njk
  - assets/
    - styles.css
  - cards/
    - socks.md         -> sample card
  - index.njk
- .eleventy.js
- package.json

## Adding cards
Add a `.md` file under `src/cards/` with frontmatter keys:
- title
- image (URL or emoji)
- questions (YAML array)
- tone (optional)

Body: paragraphs, then a line with `[answers]` and numbered answers.

Example card file included: `src/cards/socks.md`.
