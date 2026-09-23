/* Day Island — the shared "return portal" for every sub-page.
 *
 * Each page keeps a plain static link (so it works without JS):
 *   <a data-island-return href="../index.html#build/developer-measured">← Home</a>
 *   <script src="../assets/chrome/chrome.js" defer data-stop="build"></script>
 *
 * This script draws one consistent chip in that link's place — a contour
 * glyph, "← Home", and the hour/place on the island it returns to — and hides
 * the original. The chip lives in a shadow root, so a deck's own CSS and key
 * handlers are untouched. It inherits the original link's position (fixed,
 * absolute or in the flow) and picks ink-on-paper or cyanotype from the
 * background it sits on.
 */
(function () {
  "use strict";
  var me = document.currentScript;
  var STOPS = {
    island: ["now", "The island"],
    run: ["05:30", "The dawn run"],
    build: ["09:00", "The studio"],
    read: ["13:00", "The library"],
    climb: ["16:00", "The fort"],
    commons: ["18:00", "The commons"],
    play: ["20:00", "The pavilion"],
    write: ["22:00", "The lighthouse"],
    night: ["00:30", "The observatory"],
  };
  var stop = (me && me.getAttribute("data-stop")) || "island";
  var z = (me && me.getAttribute("data-z")) || "2147483000";
  var place = STOPS[stop] || STOPS.island;

  var GLYPH =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 17c3-4 7-4.6 11-4s7 1.4 9 4"/><path d="M5 13c2-3 5-3.4 8-3s5 1 7 3"/><path d="M9 9c1-1.6 2.6-2 4-1.8s3 .8 4 1.8"/><path class="r" d="M11 5.5h3V3.8h-1v.7h-1v-.7h-1z"/></svg>';
  var CSS =
    ":host{all:initial;display:inline-block;vertical-align:middle}" +
    "a{display:inline-flex;align-items:center;gap:8px;padding:5px 12px 5px 8px;border-radius:999px;text-decoration:none;" +
    "font:500 13px/1.2 'IBM Plex Mono',ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.02em;" +
    "color:var(--ink);background:var(--paper);border:1px solid var(--line);box-shadow:0 4px 14px var(--shadow);" +
    "backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);transition:border-color .2s,color .2s,transform .2s;white-space:nowrap}" +
    "a:hover{color:var(--rust);border-color:var(--rust);transform:translateY(-1px)}" +
    "a:focus-visible{outline:2px solid var(--rust);outline-offset:3px}" +
    "svg{width:22px;height:22px;flex:none;fill:none;stroke:currentColor;stroke-width:1.4;stroke-linecap:round}" +
    "svg .r{fill:var(--rust);stroke:none}" +
    ".home{font-family:'Instrument Serif',Georgia,serif;font-size:17px;font-weight:400;letter-spacing:0}" +
    ".at{font-size:11px;color:var(--muted);border-left:1px solid var(--line);padding-left:8px}" +
    ".at b{color:var(--rust);font-weight:500}" +
    ".light{--paper:rgba(244,236,218,.92);--ink:#2b2620;--muted:#6a5d49;--rust:#c4642f;--line:rgba(43,38,32,.28);--shadow:rgba(43,38,32,.12)}" +
    ".dark{--paper:rgba(15,42,71,.88);--ink:#dfe9f1;--muted:#a9bccd;--rust:#e0864f;--line:rgba(223,233,241,.28);--shadow:rgba(0,0,0,.35)}" +
    "@media (max-width:560px){.at span{display:none}}" +
    "@media print{:host{display:none}}";

  function luminance(rgb) {
    var m = rgb && rgb.match(/[\d.]+/g);
    if (!m) return null;
    var a = m.length > 3 ? +m[3] : 1;
    if (a < 0.35) return null;
    return (0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]) / 255;
  }
  function backgroundBehind(el) {
    for (var n = el; n && n.nodeType === 1; n = n.parentElement) {
      var l = luminance(getComputedStyle(n).backgroundColor);
      if (l !== null) return l;
    }
    var b = luminance(getComputedStyle(document.body).backgroundColor);
    if (b !== null) return b;
    var h = luminance(getComputedStyle(document.documentElement).backgroundColor);
    return h === null ? 1 : h;
  }

  function mount() {
    var original = document.querySelector("[data-island-return]");
    if (!original || original.__islandChip) return;
    original.__islandChip = true;
    var host = document.createElement("island-return");
    var root = host.attachShadow ? host.attachShadow({ mode: "open" }) : host;
    root.innerHTML =
      "<style>" + CSS + "</style>" +
      '<a part="link"><span class="glyph"></span><span class="home"></span><span class="at"><b></b> <span></span></span></a>';
    var a = root.querySelector("a");
    a.querySelector(".glyph").outerHTML = GLYPH;
    a.querySelector(".at b").textContent = place[0];
    a.querySelector(".at span").textContent = place[1];

    function syncText() {
      a.href = original.href;
      var label = (original.textContent || "").replace(/\s+/g, " ").trim() || "← Home";
      a.querySelector(".home").textContent = label;
      a.setAttribute("aria-label", label + " — back to Day Island, " + place[0] + " " + place[1]);
    }
    syncText();
    new MutationObserver(syncText).observe(original, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ["href"] });

    // take the original's place: same parent, same kind of positioning
    function syncPlace() {
      original.style.removeProperty("display");
      var cs = getComputedStyle(original);
      var pos = cs.position;
      var s = host.style;
      var out = pos === "fixed" || pos === "absolute";
      s.position = out ? pos : "relative";
      // computed offsets come back resolved on all four sides; keep the corner
      // the original is anchored to, so the chip can size to its content
      var px = function (v) {
        return v === "auto" ? Infinity : parseFloat(v);
      };
      var leftSide = px(cs.left) <= px(cs.right);
      var topSide = px(cs.top) <= px(cs.bottom);
      s.left = out && leftSide ? cs.left : "";
      s.right = out && !leftSide ? cs.right : "";
      s.top = out && topSide ? cs.top : "";
      s.bottom = out && !topSide ? cs.bottom : "";
      s.margin = cs.margin;
      s.zIndex = pos === "fixed" || pos === "absolute" ? z : "";
      s.alignSelf = cs.alignSelf;
      var dark = backgroundBehind(original.parentElement || document.body) < 0.45;
      a.className = dark ? "dark" : "light";
      original.style.setProperty("display", "none", "important");
    }
    original.after(host);
    syncPlace();
    var t = 0;
    addEventListener("resize", function () {
      clearTimeout(t);
      t = setTimeout(syncPlace, 120);
    });
    // decks with a theme toggle repaint the page: follow them
    var mo = new MutationObserver(function () {
      clearTimeout(t);
      t = setTimeout(syncPlace, 60);
    });
    [document.documentElement, document.body].forEach(function (n) {
      mo.observe(n, { attributes: true, attributeFilter: ["class", "data-theme", "style"] });
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
})();
