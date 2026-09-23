/* Day Island — shared state for the classic scripts and the 3D world.
   Classic script (no modules) so it works on file:// and without the CDN. */
(function () {
  "use strict";
  var DI = (window.DayIsland = window.DayIsland || {});
  var root = document.documentElement;

  DI.params = new URLSearchParams(location.search);
  DI.reducedMotion = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);

  // ---- tiny event bus
  var bus = document.createElement("span");
  DI.on = function (type, fn) {
    bus.addEventListener(type, function (e) {
      fn(e.detail);
    });
  };
  DI.emit = function (type, detail) {
    bus.dispatchEvent(new CustomEvent(type, { detail: detail }));
  };

  // ---- persisted preferences (per-viewer conveniences only)
  var KEY = "dayIsland:v1";
  DI.store = {
    get: function (k) {
      try {
        return (JSON.parse(localStorage.getItem(KEY)) || {})[k];
      } catch (e) {
        return undefined;
      }
    },
    set: function (k, v) {
      try {
        var all = JSON.parse(localStorage.getItem(KEY)) || {};
        all[k] = v;
        localStorage.setItem(KEY, JSON.stringify(all));
      } catch (e) {}
    },
  };

  // ---- time in Pune (IST), whatever the visitor's zone. ?t=HH:MM&day=Sat for QA.
  var DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var fmt;
  try {
    fmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", weekday: "short", hourCycle: "h23" });
  } catch (e) {
    fmt = null;
  }
  DI.ist = function () {
    var t = DI.params.get("t");
    var h, m, day;
    if (t && /^\d{1,2}:\d{2}$/.test(t)) {
      h = +t.split(":")[0] % 24;
      m = +t.split(":")[1];
      day = DAYS.indexOf(DI.params.get("day") || "Wed");
    } else if (fmt) {
      var parts = {};
      fmt.formatToParts(new Date()).forEach(function (p) {
        parts[p.type] = p.value;
      });
      h = +parts.hour % 24;
      m = +parts.minute;
      day = DAYS.indexOf(parts.weekday);
    } else {
      // IST is UTC+5:30 all year
      var d = new Date(Date.now() + 5.5 * 3600e3);
      h = d.getUTCHours();
      m = d.getUTCMinutes();
      day = d.getUTCDay();
    }
    return { h: h, m: m, day: day, hour: h + m / 60, weekend: day === 0 || day === 6, label: DI.fmtHour(h + m / 60) };
  };
  DI.fmtHour = function (hour) {
    var hh = ((Math.floor(hour) % 24) + 24) % 24;
    var mm = Math.round((hour - Math.floor(hour)) * 60) % 60;
    return (hh < 10 ? "0" : "") + hh + ":" + (mm < 10 ? "0" : "") + mm;
  };

  // ---- the stops, read from the page
  DI.stops = Array.prototype.map.call(document.querySelectorAll("main > .stop"), function (el, i) {
    var h = el.getAttribute("data-hour");
    var heading = el.querySelector("h1, h2");
    var kicker = el.querySelector(".kicker time");
    var marker = h === "now" ? "now" : kicker ? kicker.textContent : "all";
    el.setAttribute("data-marker", marker);
    var link = document.querySelector('[data-stop-link="' + el.id + '"] .daybar__name');
    return {
      id: el.id,
      index: i,
      el: el,
      hour: h === "now" || h === null ? null : +h,
      out: el.hasAttribute("data-hour-out") ? +el.getAttribute("data-hour-out") : null,
      time: marker,
      name: link ? link.textContent : el.id,
      title: heading ? heading.textContent.trim() : el.id,
    };
  });
  DI.stop = function (id) {
    for (var i = 0; i < DI.stops.length; i++) if (DI.stops[i].id === id) return DI.stops[i];
    return null;
  };

  // Where Sanket probably is at an hour (IST) — drives the "now" line and ⌘K "Jump to now".
  DI.whereAt = function (now) {
    var t = now.hour;
    if (t < 0.5 || t >= 23.9) return { stop: "night", text: "reading past midnight at the observatory" };
    if (t < 5) return { stop: "write", text: "asleep — the lighthouse keeps watch" };
    if (t < 7.5) return { stop: "run", text: "out on the dawn run along the river" };
    if (now.weekend && t < 18) return { stop: "climb", text: "somewhere on a Sahyadri ridge — it's the weekend" };
    if (t < 9) return { stop: "build", text: "coffee, then the commute to the studio" };
    if (t < 13) return { stop: "build", text: "at the studio, deep in a data pipeline" };
    if (t < 14) return { stop: "read", text: "a chapter over lunch in the library" };
    if (t < 18) return { stop: "build", text: "back at the studio, shipping" };
    if (t < 20) return { stop: "commons", text: "at the commons — research, people, policy" };
    if (t < 22) return { stop: "play", text: "unwinding at the pavilion" };
    return { stop: "write", text: "writing one more post before lights out" };
  };

  root.classList.add("di-ready");
})();
