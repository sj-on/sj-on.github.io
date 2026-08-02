(function () {
  "use strict";

  var deck = document.getElementById("deck");
  var counterEl = document.getElementById("counter");
  var hintEl = document.getElementById("hint");
  var splashEl = document.getElementById("splash");

  var cards = [];
  var index = 0; // 0 = latest (highest number)

  var SWIPE_THRESHOLD_RATIO = 0.28; // fraction of deck width to commit a swipe
  var RESIST_RATIO = 0.35; // how much a blocked-direction drag is dampened

  function canGoOlder() {
    // swipe right: move toward older cards
    return index < cards.length - 1;
  }
  function canGoNewer() {
    // swipe left: move toward newer cards
    return index > 0;
  }

  function faceMarkup(card, faceClass) {
    if (faceClass === "front") {
      var qs = card.questions
        .map(function (q) {
          return '<div class="q">' + escapeHtml(q) + "</div>";
        })
        .join("");
      return (
        '<div class="face front">' +
        '<div class="card-emoji">' + escapeHtml(card.image) + "</div>" +
        '<div>' +
        '<div class="card-id">card #' + card.number + "</div>" +
        '<h2 class="card-title">' + escapeHtml(card.title) + "</h2>" +
        '</div>' +
        '<div class="card-questions">' + qs + "</div>" +
        '<div class="face-note">tap to flip</div>' +
        "</div>"
      );
    }
    return (
      '<div class="face back">' +
      '<div class="back-head"><div class="icon">🔎</div><div>' +
      '<div class="small">answers</div>' +
      '<h2 class="card-title">' + escapeHtml(card.title) + "</h2>" +
      "</div></div>" +
      '<div class="intro">' + (card.introHtml || "") + "</div>" +
      (card.answersHtml
        ? '<div class="answers-label">answers</div><div class="answers">' +
          card.answersHtml +
          "</div>"
        : "") +
      '<div class="face-note">tap to flip back</div>' +
      "</div>"
    );
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return (
        { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
      );
    });
  }

  function buildCardEl(card, kind) {
    var el = document.createElement("div");
    el.className = "card " + kind;
    el.innerHTML =
      '<div class="card-inner">' +
      faceMarkup(card, "front") +
      faceMarkup(card, "back") +
      "</div>";
    return el;
  }

  function updateCounter() {
    counterEl.textContent = "card " + (index + 1) + " of " + cards.length;
  }

  function updateHint(boundaryMsg) {
    if (boundaryMsg) {
      hintEl.textContent = boundaryMsg;
      hintEl.classList.add("boundary");
    } else {
      hintEl.textContent = "tap to flip · swipe to move";
      hintEl.classList.remove("boundary");
    }
  }

  function render() {
    deck.innerHTML = "";
    updateCounter();
    updateHint(null);

    // Resting peek: show the next-older card behind the top card, if any.
    if (canGoOlder()) {
      deck.appendChild(buildCardEl(cards[index + 1], "behind"));
    }
    var topEl = buildCardEl(cards[index], "top");
    deck.appendChild(topEl);
    attachGestures(topEl);
  }

  function attachGestures(topEl) {
    var dragging = false;
    var startX = 0;
    var startY = 0;
    var dx = 0;
    var pointerId = null;
    var behindSwapped = null; // 'older' | 'newer' | null

    var deckWidth = deck.clientWidth || 320;

    function setBehindCard(direction) {
      var existing = deck.querySelector(".card.behind");
      var wanted = null;
      if (direction === "right" && canGoOlder()) wanted = "older";
      if (direction === "left" && canGoNewer()) wanted = "newer";

      if (wanted === behindSwapped) return;
      if (existing) existing.remove();
      behindSwapped = wanted;

      if (wanted === "older") {
        var el = buildCardEl(cards[index + 1], "behind");
        deck.insertBefore(el, topEl);
      } else if (wanted === "newer") {
        var el2 = buildCardEl(cards[index - 1], "behind");
        deck.insertBefore(el2, topEl);
      }
    }

    function resetBehindToRest() {
      var existing = deck.querySelector(".card.behind");
      if (existing) existing.remove();
      behindSwapped = null;
      if (canGoOlder()) {
        deck.insertBefore(buildCardEl(cards[index + 1], "behind"), topEl);
      }
    }

    function onPointerDown(e) {
      if (e.target.closest(".card") !== topEl) return;
      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      dx = 0;
      pointerId = e.pointerId;
      topEl.setPointerCapture(pointerId);
      topEl.classList.add("dragging");
      deckWidth = deck.clientWidth || 320;
    }

    function onPointerMove(e) {
      if (!dragging || e.pointerId !== pointerId) return;
      dx = e.clientX - startX;
      var dy = e.clientY - startY;
      if (Math.abs(dy) > Math.abs(dx) * 1.5) return; // treat as vertical scroll intent

      var direction = dx > 0 ? "right" : dx < 0 ? "left" : null;
      var allowed =
        (direction === "right" && canGoOlder()) ||
        (direction === "left" && canGoNewer());

      var appliedDx = dx;
      if (direction && !allowed) {
        appliedDx = dx * RESIST_RATIO; // rubber-band resistance at the edge
        updateHint(
          direction === "right"
            ? "that's the oldest one"
            : "that's the latest one"
        );
      } else {
        updateHint(null);
      }

      if (direction) setBehindCard(direction);

      var rotate = (appliedDx / deckWidth) * 14;
      topEl.style.transform =
        "translateX(" + appliedDx + "px) rotate(" + rotate + "deg)";
      topEl.style.opacity = String(1 - Math.min(Math.abs(appliedDx) / deckWidth, 0.4));
    }

    function onPointerUp(e) {
      if (!dragging || e.pointerId !== pointerId) return;
      dragging = false;
      topEl.classList.remove("dragging");
      updateHint(null);

      var direction = dx > 0 ? "right" : dx < 0 ? "left" : null;
      var allowed =
        (direction === "right" && canGoOlder()) ||
        (direction === "left" && canGoNewer());
      var pastThreshold = Math.abs(dx) > deckWidth * SWIPE_THRESHOLD_RATIO;

      if (direction && allowed && pastThreshold) {
        commitSwipe(direction, topEl);
      } else {
        topEl.style.transform = "";
        topEl.style.opacity = "";
        resetBehindToRest();
      }
    }

    function onTap() {
      if (Math.abs(dx) > 6) return; // was a drag, not a tap
      topEl.classList.toggle("flipped");
    }

    function commitSwipe(direction, el) {
      var flyX = (direction === "right" ? 1 : -1) * (deckWidth + 120);
      el.style.transform =
        "translateX(" + flyX + "px) rotate(" + (flyX / deckWidth) * 14 + "deg)";
      el.style.opacity = "0";
      window.setTimeout(function () {
        index += direction === "right" ? 1 : -1;
        render();
      }, 260);
    }

    topEl.addEventListener("pointerdown", onPointerDown);
    topEl.addEventListener("pointermove", onPointerMove);
    topEl.addEventListener("pointerup", function (e) {
      onPointerUp(e);
      onTap();
    });
    topEl.addEventListener("pointercancel", onPointerUp);

    // Desktop keyboard support, handy while testing in a browser
    window.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight" && canGoOlder()) commitSwipe("right", topEl);
      if (e.key === "ArrowLeft" && canGoNewer()) commitSwipe("left", topEl);
      if (e.key === " ") topEl.classList.toggle("flipped");
    });
  }

  function hideSplash() {
    splashEl.classList.add("hidden");
  }

  // Cards are fetched live from the published site first, so new/edited
  // cards show up without anyone having to reinstall the app. The copy
  // bundled at build time (./cards.json, right next to this file) is only
  // a fallback for offline / first-launch-before-any-network use.
  var LIVE_CARDS_URL = "https://sj-on.github.io/cards.json";
  var LIVE_FETCH_TIMEOUT_MS = 4000;

  function fetchWithTimeout(url, ms) {
    var controller = new AbortController();
    var timer = window.setTimeout(function () {
      controller.abort();
    }, ms);
    return fetch(url, { signal: controller.signal, cache: "no-store" }).finally(
      function () {
        window.clearTimeout(timer);
      }
    );
  }

  function loadCards() {
    return fetchWithTimeout(LIVE_CARDS_URL, LIVE_FETCH_TIMEOUT_MS)
      .then(function (r) {
        if (!r.ok) throw new Error("live fetch returned " + r.status);
        return r.json();
      })
      .catch(function (err) {
        console.warn(
          "live cards.json fetch failed, falling back to bundled copy:",
          err.message
        );
        return fetch("cards.json").then(function (r) {
          if (!r.ok) throw new Error("bundled cards.json missing too");
          return r.json();
        });
      });
  }

  function init() {
    loadCards()
      .then(function (data) {
        cards = data; // already sorted newest-first by build-cards-json.mjs
        index = 0;
        render();
        // Small deliberate pause so the mark is seen, then fade to the deck.
        window.setTimeout(hideSplash, 900);
      })
      .catch(function (err) {
        hintEl.textContent = "couldn't load cards — " + err.message;
        hideSplash();
      });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
