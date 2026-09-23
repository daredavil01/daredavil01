/* Decide between the island and the classic view, and load the 3D world
   only when it can run. Anything that fails leaves the classic page as is.
     ?island / ?classic   force a view (and remember it)
     ?capture=…           render a still for tools/capture.mjs
     ?debug               frame-time HUD */
(function () {
  "use strict";
  var DI = window.DayIsland;
  var root = document.documentElement;
  var here = document.currentScript && document.currentScript.src;
  var p = DI.params;
  var modeBtn = document.querySelector("[data-action=mode]");
  var label = document.querySelector("[data-mode-label]");

  function webgl2() {
    try {
      var c = document.createElement("canvas");
      var gl = c.getContext("webgl2");
      return !!(gl && gl.getExtension);
    } catch (e) {
      return false;
    }
  }
  function modules() {
    return "noModule" in HTMLScriptElement.prototype && HTMLScriptElement.supports && HTMLScriptElement.supports("importmap");
  }

  var capture = p.get("capture");
  var forced = p.has("island") ? "island" : p.has("classic") ? "classic" : null;
  if (forced) DI.store.set("mode", forced);
  var pref = forced || DI.store.get("mode") || "auto";
  var saveData = navigator.connection && navigator.connection.saveData;
  var can = location.protocol !== "file:" && modules() && webgl2();

  DI.canIsland = can;
  var want = capture ? "capture" : pref === "island" ? "island" : pref === "classic" ? "classic" : DI.reducedMotion || saveData ? "classic" : "island";
  DI.mode = can && want !== "classic" ? want : "classic";

  if (modeBtn && can) {
    modeBtn.hidden = false;
    if (label) label.textContent = DI.mode === "island" ? "Classic view" : "Island view";
  }

  if (DI.mode === "classic") {
    root.classList.add("mode-classic");
    return;
  }

  var entry = new URL(DI.mode === "capture" ? "world/capture.js" : "world/main3d.js", here || location.href).href;
  if (DI.mode === "capture") root.classList.add("mode-capture");
  else {
    // lay the page out as the island straight away (panels, spacers, the ink
    // poster behind a loading ring) so nothing jumps when the canvas arrives
    root.classList.add("mode-island", "mode-loading");
    // first paint in the right light: cyanotype if it's night in Pune
    var h = DI.ist().hour;
    if (h >= 19.4 || h < 5.1) root.setAttribute("data-theme", "dark");
    DI.transits = DI.stops.slice(1).map(function (s) {
      var t = document.createElement("div");
      t.className = "transit";
      t.setAttribute("aria-hidden", "true");
      s.el.parentNode.insertBefore(t, s.el);
      return t;
    });
    var poster = document.querySelector(".stage__poster");
    var still = document.querySelector("#island .still img");
    if (poster && still) poster.style.setProperty("--poster", 'url("' + still.src + '")');
  }
  DI.world = { pending: true, active: false };
  import(entry)
    .then(function (m) {
      return m.boot(DI);
    })
    .catch(function (err) {
      console.warn("[island] staying in the classic view:", err);
      (DI.transits || []).forEach(function (t) {
        t.remove();
      });
      root.classList.remove("mode-loading", "mode-island");
      root.removeAttribute("data-theme"); // back to the visitor's own light/dark preference
      root.classList.add("mode-classic");
      DI.world = null;
      DI.mode = "classic";
      if (label) label.textContent = "Island view";
      if (DI.initialTarget) DI.go(DI.initialTarget, { push: false, instant: true });
    });
})();
