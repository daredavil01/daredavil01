/* The registry: every page and project is one <article class="card"> in
   #map. This moves each card to its stop, leaves a compact list in each
   band, and builds the index that ⌘K and the island's hotspots use. */
(function () {
  "use strict";
  var DI = window.DayIsland;
  var cards = Array.prototype.slice.call(document.querySelectorAll("#map article.card"));
  var text = function (el, sel) {
    var n = el.querySelector(sel);
    return n ? n.textContent.trim() : "";
  };

  DI.cards = cards.map(function (card) {
    var link = card.querySelector(".card__link");
    return {
      id: card.id,
      stop: card.getAttribute("data-stop"),
      band: card.getAttribute("data-band"),
      slug: card.id.split("/")[1],
      title: text(card, ".card__title"),
      kicker: text(card, ".card__kicker"),
      href: link ? link.getAttribute("href") : null,
      external: link ? /^https?:/.test(link.getAttribute("href")) : false,
      el: card,
    };
  });

  // compact band lists: kicker, title (straight to the page), and where it lives
  Array.prototype.forEach.call(document.querySelectorAll("#map .band"), function (band) {
    var list = document.createElement("ul");
    list.className = "band-list";
    DI.cards
      .filter(function (c) {
        return c.band === band.getAttribute("data-band");
      })
      .forEach(function (c) {
        var stop = DI.stop(c.stop);
        var li = document.createElement("li");
        li.innerHTML =
          '<span class="band-list__kicker"></span><a class="band-list__title"></a><a class="band-list__where"></a>';
        li.querySelector(".band-list__kicker").textContent = c.kicker;
        var a = li.querySelector(".band-list__title");
        a.textContent = c.title;
        a.href = c.href;
        var where = li.querySelector(".band-list__where");
        where.textContent = "· " + (stop ? stop.time + " " + stop.name : c.stop);
        where.href = "#" + c.id;
        list.appendChild(li);
      });
    var holder = band.querySelector(".band__cards");
    holder.parentNode.insertBefore(list, holder);
  });

  // move each card to its stop
  DI.cards.forEach(function (c) {
    var slot = document.querySelector('[data-cards-for="' + c.stop + '"]');
    if (slot) slot.appendChild(c.el);
  });
  Array.prototype.forEach.call(document.querySelectorAll("#map .band__cards"), function (el) {
    if (!el.children.length) el.remove();
  });

  // ---- the ⌘K index
  var index = [];
  DI.stops.forEach(function (s) {
    index.push({ label: s.title, kind: "stop", stop: s.id, time: s.time, go: s.id, keys: s.name });
  });
  DI.cards.forEach(function (c) {
    var s = DI.stop(c.stop);
    index.push({ label: c.title, kind: c.external ? "live ↗" : "page", stop: c.stop, time: s ? s.time : "", go: c.id, href: c.href, keys: c.kicker });
  });
  Array.prototype.forEach.call(document.querySelectorAll("[data-cmd]"), function (el) {
    var section = el.closest(".stop");
    var stop = section ? DI.stop(section.id) : null;
    var href = el.getAttribute("href") || (el.querySelector("a[href]") && el.querySelector("a[href]").getAttribute("href"));
    var label = el.getAttribute("data-cmd-label") || el.textContent.replace(/\s+/g, " ").trim();
    var kind = el.getAttribute("data-cmd");
    if (!el.id) el.id = (stop ? stop.id : "x") + "/" + kind + "-" + label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
    index.push({
      label: label,
      kind: kind,
      stop: stop ? stop.id : null,
      time: stop ? stop.time : "",
      go: el.getAttribute("data-cmd-go") || el.id,
      href: kind === "social" || kind === "live" ? href : null,
    });
  });
  index.push({ label: "Jump to now in Pune", kind: "action", action: "now", time: "now" });
  index.push({ label: "Switch between island and classic view", kind: "action", action: "mode", time: "" });
  index.push({ label: "Copy a link to this spot", kind: "action", action: "copy", time: "" });
  DI.index = index;
  DI.emit("registry");
})();
