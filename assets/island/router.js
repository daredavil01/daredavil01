/* Routing without a framework: every place on the island is a real element
   id (#run, #read/ask-the-archive). Links, ⌘K, hotspots and the keyboard all
   call DayIsland.go(); in island mode the world turns that into a flight. */
(function () {
  "use strict";
  var DI = window.DayIsland;
  var announcer = document.getElementById("announcer");
  var targetTimer = 0;

  function stopOf(id) {
    return (id || "").split("/")[0];
  }

  DI.go = function (target, opts) {
    opts = opts || {};
    target = decodeURIComponent(target || "island");
    var el = document.getElementById(target);
    if (!el) return false;
    var stop = DI.stop(stopOf(target)) || DI.stop(el.closest(".stop") && el.closest(".stop").id);
    if (opts.push !== false && location.hash !== "#" + target) {
      try {
        history.pushState({ go: target }, "", "#" + target);
      } catch (e) {}
    }
    // highlight a card (or any non-stop target) for a few seconds
    Array.prototype.forEach.call(document.querySelectorAll(".is-target"), function (n) {
      n.classList.remove("is-target");
    });
    if (el.classList.contains("card") || !el.classList.contains("stop")) {
      el.classList.add("is-target");
      clearTimeout(targetTimer);
      targetTimer = setTimeout(function () {
        el.classList.remove("is-target");
      }, opts.keep ? 9000 : 6000);
    }
    var instant = opts.instant || DI.reducedMotion;
    if (DI.world && DI.world.active) {
      DI.world.flyTo(target, { instant: instant, hour: opts.hour });
    } else {
      el.scrollIntoView({ behavior: instant ? "auto" : "smooth", block: "start" });
    }
    // move focus for keyboard and screen-reader users without a second scroll
    var focusable = el.classList.contains("card") ? el.querySelector(".card__link") : el.querySelector("h1, h2") || el;
    if (focusable && opts.focus !== false) {
      if (!focusable.hasAttribute("tabindex") && !/^(A|BUTTON)$/.test(focusable.tagName)) focusable.setAttribute("tabindex", "-1");
      try {
        focusable.focus({ preventScroll: true });
      } catch (e) {}
    }
    if (announcer && stop) announcer.textContent = (stop.time === "now" ? "" : stop.time + ", ") + stop.title;
    DI.emit("navigate", { target: target, stop: stop ? stop.id : null });
    return true;
  };

  DI.goNow = function (opts) {
    var now = DI.ist();
    var where = DI.whereAt(now);
    DI.go(where.stop, Object.assign({ hour: now.hour }, opts || {}));
  };

  // same-page links → go()
  document.addEventListener("click", function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute("href").slice(1);
    if (!id || !document.getElementById(decodeURIComponent(id))) return;
    e.preventDefault();
    DI.go(id);
  });

  window.addEventListener("popstate", function () {
    DI.go(location.hash.slice(1) || "island", { push: false, focus: false });
  });

  // a deep link on first load: cards have moved, so land there ourselves
  DI.initialTarget = location.hash ? decodeURIComponent(location.hash.slice(1)) : null;
  if (DI.initialTarget && document.getElementById(DI.initialTarget)) {
    var land = function () {
      if (!(DI.world && DI.world.pending)) DI.go(DI.initialTarget, { push: false, instant: true, keep: true });
    };
    if (document.readyState === "complete") land();
    else window.addEventListener("load", land, { once: true });
  }
})();
