/* Page chrome that works in both views: the Pune clock and "now" line, the
   ink stills, the day bar, buttons, and keyboard shortcuts. */
(function () {
  "use strict";
  var DI = window.DayIsland;
  var $ = function (s, r) {
    return (r || document).querySelector(s);
  };
  var $$ = function (s, r) {
    return Array.prototype.slice.call((r || document).querySelectorAll(s));
  };

  // ---- clock + "now" line (IST)
  var clock = $("#clock");
  var nowLine = $("#now-line");
  function tick() {
    var now = DI.ist();
    if (clock) {
      clock.textContent = now.label;
      clock.setAttribute("datetime", now.label);
    }
    if (nowLine) {
      var where = DI.whereAt(now);
      nowLine.textContent = "It's " + now.label + " in Pune — probably " + where.text + ".";
      nowLine.setAttribute("href", "#" + where.stop);
    }
    DI.emit("tick", now);
  }
  tick();
  setInterval(tick, 20000);

  // ---- ink stills: recolour with the theme's ink via CSS mask
  $$(".still img").forEach(function (img) {
    var fig = img.closest(".still");
    var ok = function () {
      fig.style.setProperty("--still", 'url("' + (img.currentSrc || img.src) + '")');
      fig.classList.add("is-masked");
    };
    var bad = function () {
      fig.classList.add("is-missing");
    };
    if (img.complete) (img.naturalWidth ? ok : bad)();
    else {
      img.addEventListener("load", ok, { once: true });
      img.addEventListener("error", bad, { once: true });
    }
  });

  // ---- day bar: which stop is on screen (classic view; the island sets it itself)
  DI.setCurrentStop = function (id) {
    if (DI.currentStop === id) return;
    DI.currentStop = id;
    $$("[data-stop-link]").forEach(function (a) {
      if (a.getAttribute("data-stop-link") === id) a.setAttribute("aria-current", "true");
      else a.removeAttribute("aria-current");
    });
    DI.emit("stopchange", id);
  };
  if ("IntersectionObserver" in window) {
    var seen = {};
    var io = new IntersectionObserver(
      function (entries) {
        if (DI.world && DI.world.active) return;
        entries.forEach(function (e) {
          seen[e.target.id] = e.isIntersecting ? e.intersectionRatio : 0;
        });
        var best = null, bestR = 0;
        Object.keys(seen).forEach(function (k) {
          if (seen[k] > bestR) {
            best = k;
            bestR = seen[k];
          }
        });
        if (best) DI.setCurrentStop(best);
      },
      { rootMargin: "-35% 0px -55% 0px", threshold: [0, 0.01, 0.5, 1] }
    );
    DI.stops.forEach(function (s) {
      io.observe(s.el);
    });
  }

  // ---- buttons
  DI.setMode = function (mode) {
    DI.store.set("mode", mode);
    var p = new URLSearchParams(location.search);
    p.delete("classic");
    p.delete("island");
    var q = p.toString();
    location.href = location.pathname + (q ? "?" + q : "") + location.hash;
  };
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-action]");
    if (!b) return;
    var action = b.getAttribute("data-action");
    if (action === "now") DI.goNow();
    else if (action === "cmdk") DI.cmdk && DI.cmdk.open();
    else if (action === "mode") DI.setMode(DI.mode === "island" ? "classic" : "island");
    else if (action === "mode-link") {
      e.preventDefault();
      DI.setMode(b.getAttribute("data-mode"));
    } else if (action === "copy") DI.copyLink();
    else return;
    if (b.tagName === "A") e.preventDefault();
  });
  DI.copyLink = function () {
    var url = location.href;
    try {
      navigator.clipboard.writeText(url);
    } catch (e) {}
    var ann = $("#announcer");
    if (ann) ann.textContent = "Link copied.";
  };

  // ---- keyboard: ←/→ between stops, n for now, ⌘K / Ctrl+K / "/" for search
  document.addEventListener("keydown", function (e) {
    var t = e.target;
    var typing = t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
    if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
      e.preventDefault();
      DI.cmdk && DI.cmdk.toggle();
      return;
    }
    if (typing || e.metaKey || e.ctrlKey || e.altKey || (DI.cmdk && DI.cmdk.isOpen)) return;
    if (e.key === "/") {
      e.preventDefault();
      DI.cmdk && DI.cmdk.open();
    } else if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      var i = Math.max(0, DI.stops.findIndex(function (s) {
        return s.id === DI.currentStop;
      }));
      var next = DI.stops[Math.min(DI.stops.length - 1, Math.max(0, i + (e.key === "ArrowRight" ? 1 : -1)))];
      if (next) {
        e.preventDefault();
        DI.go(next.id);
      }
    } else if (e.key === "n" || e.key === "N") {
      DI.goNow();
    }
  });
})();
