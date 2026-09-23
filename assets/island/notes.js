/* Hidden field notes. Twelve handwritten notes, each alive only inside its
   hour window: on the island they show as ✎ pins (the world places them), in
   the classic view they appear in the margin while Pune's clock is inside
   the window. A found note is remembered — that's all; no quests, no prizes. */
(function () {
  "use strict";
  var DI = window.DayIsland;
  var tpl = document.getElementById("field-notes");
  var list = tpl
    ? Array.prototype.map.call(tpl.content.querySelectorAll("[data-note]"), function (n) {
        return {
          id: n.getAttribute("data-note"),
          stop: n.getAttribute("data-stop"),
          from: +n.getAttribute("data-from"),
          to: +n.getAttribute("data-to"),
          clock: n.getAttribute("data-clock") || "scene",
          text: n.textContent.trim(),
        };
      })
    : [];
  var found = {};
  (DI.store.get("notes") || []).forEach(function (id) {
    found[id] = true;
  });

  function within(note, hour) {
    var h = ((hour % 24) + 24) % 24;
    return note.from <= note.to ? h >= note.from && h <= note.to : h >= note.from || h <= note.to;
  }

  DI.notes = {
    list: list,
    isFound: function (id) {
      return !!found[id];
    },
    // visible for the scene hour (or, for "real" notes, for Pune's actual time)
    visible: function (sceneHour) {
      var real = DI.ist().hour;
      return list.filter(function (n) {
        return within(n, n.clock === "real" ? real : sceneHour);
      });
    },
    find: function (id) {
      if (found[id]) return;
      found[id] = true;
      DI.store.set("notes", Object.keys(found));
      DI.notes.updateCount();
    },
    updateCount: function () {
      var el = document.getElementById("notes-count");
      if (!el) return;
      var n = Object.keys(found).length;
      el.hidden = !(DI.world && DI.world.active);
      el.textContent = "field notes " + n + "/" + list.length;
    },
  };

  // classic view: margin notes for the real hour in Pune
  function renderClassic() {
    Array.prototype.forEach.call(document.querySelectorAll(".field-notes"), function (n) {
      n.remove();
    });
    if (DI.world && DI.world.active) return;
    var real = DI.ist().hour;
    list.forEach(function (n) {
      if (n.clock !== "real" && !within(n, real)) return;
      if (n.clock === "real" && !within(n, real)) return;
      var stop = document.getElementById(n.stop);
      if (!stop) return;
      var box = stop.querySelector(".field-notes");
      if (!box) {
        box = document.createElement("div");
        box.className = "field-notes";
        stop.appendChild(box);
      }
      var aside = document.createElement("aside");
      aside.className = "field-note";
      aside.textContent = n.text;
      aside.setAttribute("aria-label", "Field note");
      box.appendChild(aside);
    });
  }
  renderClassic();
  DI.on("tick", function () {
    if (!(DI.world && DI.world.active)) renderClassic();
  });
  DI.notes.updateCount();
})();
