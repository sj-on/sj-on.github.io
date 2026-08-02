#!/usr/bin/env node
/**
 * build-cards-json.mjs
 *
 * Reads every markdown card in src/cards/*.md and emits app/www/cards.json.
 * This is the ONE place card content is parsed for the app. The website
 * gets the same content independently via 11ty's own collection in
 * .eleventy.js — both read the identical source files in src/cards/, so
 * they can never drift out of sync as long as this script and the
 * eleventy collection agree on the sort order (highest `number` first).
 *
 * Markdown in the card body (bold, italic, nested lists, etc.) is rendered
 * with markdown-it — the same engine 11ty uses internally by default — so
 * the app's formatting matches the website's exactly, not an approximation
 * of it.
 *
 * The output file is also passthrough-copied into the built site as
 * /cards.json by .eleventy.js, so the app can fetch the live version at
 * runtime instead of only ever showing whatever was bundled at build time.
 */

import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import MarkdownIt from "markdown-it";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const CARDS_DIR = path.join(REPO_ROOT, "src", "cards");
const OUT_FILE = path.join(REPO_ROOT, "app", "www", "cards.json");

const md = new MarkdownIt({ html: true });

function splitFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { frontmatter: {}, body: raw };
  return { frontmatter: parseFrontmatter(match[1]), body: match[2] };
}

// Minimal YAML-ish parser: handles `key: value`, `key: "quoted value"`,
// and simple `key:` followed by `  - "item"` list lines. That's the full
// vocabulary used by src/cards/*.md frontmatter.
function parseFrontmatter(block) {
  const lines = block.split(/\r?\n/);
  const data = {};
  let currentListKey = null;

  for (const line of lines) {
    if (/^\s*-\s+/.test(line) && currentListKey) {
      const item = line.replace(/^\s*-\s+/, "").trim();
      data[currentListKey].push(stripQuotes(item));
      continue;
    }
    const kv = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!kv) continue;
    const [, key, rest] = kv;
    if (rest.trim() === "") {
      data[key] = [];
      currentListKey = key;
    } else {
      data[key] = stripQuotes(rest.trim());
      currentListKey = null;
    }
  }
  return data;
}

function stripQuotes(s) {
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    return s.slice(1, -1);
  }
  return s;
}

// Body markdown looks like:
//   some paragraphs...
//
//   #### [answers]
//   1. answer one
//
//   2. answer two
//      - nested detail
//
// We render the two halves as markdown separately (rather than reducing
// them to plain strings) so bold, italic, and nested lists survive intact
// on both the site and the app.
function renderIntroHtml(body) {
  const marker = body.indexOf("#### [answers]");
  const introMarkdown = marker === -1 ? body : body.slice(0, marker);
  return md.render(introMarkdown.trim());
}

function renderAnswersHtml(body) {
  const marker = body.indexOf("[answers]");
  if (marker === -1) return "";
  const answersMarkdown = body.slice(marker + "[answers]".length);
  return md.render(answersMarkdown.trim());
}

function main() {
  const files = readdirSync(CARDS_DIR).filter(
    (f) => f.endsWith(".md") && !f.endsWith(".11tydata.json")
  );

  const cards = files.map((filename) => {
    const raw = readFileSync(path.join(CARDS_DIR, filename), "utf8");
    const { frontmatter, body } = splitFrontmatter(raw);
    const slug = filename
      .replace(/\.md$/, "")
      .toLowerCase()
      .replace(/\s+/g, "-");

    return {
      slug,
      number: Number(frontmatter.number) || 0,
      title: frontmatter.title || slug,
      image: frontmatter.image || "🃏",
      questions: Array.isArray(frontmatter.questions)
        ? frontmatter.questions
        : [],
      introHtml: renderIntroHtml(body),
      answersHtml: renderAnswersHtml(body),
    };
  });

  // Same sort as .eleventy.js: highest `number` first (latest card first).
  cards.sort((a, b) => b.number - a.number);

  mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  writeFileSync(OUT_FILE, JSON.stringify(cards, null, 2) + "\n");

  console.log(`wrote ${cards.length} cards to ${path.relative(REPO_ROOT, OUT_FILE)}`);
}

main();
