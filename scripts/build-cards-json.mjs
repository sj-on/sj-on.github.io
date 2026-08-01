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
 * No external dependencies on purpose — this only needs to run reliably
 * in CI, so it's plain Node + a small hand-rolled frontmatter parser
 * tailored to this repo's card format.
 */

import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const CARDS_DIR = path.join(REPO_ROOT, "src", "cards");
const OUT_FILE = path.join(REPO_ROOT, "app", "www", "cards.json");

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
//
// We only need the numbered answers, aligned by index to `questions`.
function extractAnswers(body) {
  const marker = body.indexOf("[answers]");
  if (marker === -1) return [];
  const afterMarker = body.slice(marker + "[answers]".length);

  const answers = [];
  const itemRegex = /^\s*(\d+)\.\s+([\s\S]*?)(?=^\s*\d+\.\s+|\s*$(?![\s\S]))/gm;
  let match;
  while ((match = itemRegex.exec(afterMarker)) !== null) {
    const text = match[2].trim().replace(/\s+/g, " ");
    if (text) answers.push(text);
  }
  return answers;
}

// The paragraphs that come before "#### [answers]" — these are the setup
// that makes the answers make sense, and the card back needs to keep them.
function extractIntro(body) {
  const marker = body.indexOf("#### [answers]");
  const beforeMarker = marker === -1 ? body : body.slice(0, marker);

  return beforeMarker
    .split(/\r?\n\s*\r?\n/) // split into paragraphs on blank lines
    .map((p) => p.trim().replace(/\s+/g, " "))
    .filter(Boolean);
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
      intro: extractIntro(body),
      answers: extractAnswers(body),
    };
  });

  // Same sort as .eleventy.js: highest `number` first (latest card first).
  cards.sort((a, b) => b.number - a.number);

  mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  writeFileSync(OUT_FILE, JSON.stringify(cards, null, 2) + "\n");

  console.log(`wrote ${cards.length} cards to ${path.relative(REPO_ROOT, OUT_FILE)}`);
}

main();
