/* ⌘K — search every stop, page, race, fort, genre and link on the island.
   Enter flies there; ⌘/Ctrl/Shift+Enter opens a page directly. */
(function () {
  "use strict";
  var DI = window.DayIsland;
  var root, input, list, items = [], active = 0, lastFocus = null;

  function score(q, s) {
    // subsequence match; consecutive and word-start hits score higher
    s = s.toLowerCase();
    var qi = 0, sc = 0, run = 0;
    for (var i = 0; i < s.length && qi < q.length; i++) {
      if (s[i] === q[qi]) {
        qi++;
        run++;
        sc += 1 + run * 2 + (i === 0 || /[\s\/·—-]/.test(s[i - 1]) ? 6 : 0);
      } else run = 0;
    }
    return qi === q.length ? sc - s.length * 0.02 : -1;
  }

  function build() {
    root = document.createElement("div");
    root.className = "cmdk";
    root.hidden = true;
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-label", "Search the island");
    root.innerHTML =
      '<div class="cmdk__box">' +
      '<input class="cmdk__input" type="text" role="combobox" aria-expanded="true" aria-controls="cmdk-list" aria-autocomplete="list" placeholder="Search the day — a race, a fort, a deck…" autocomplete="off" spellcheck="false" />' +
      '<ul class="cmdk__list" id="cmdk-list" role="listbox" aria-label="Results"></ul>' +
      '<p class="cmdk__foot">↑↓ to move · Enter to fly there · ⌘/Shift+Enter opens the page · Esc to close</p>' +
      "</div>";
    document.body.appendChild(root);
    input = root.querySelector("input");
    list = root.querySelector("ul");
    input.addEventListener("input", render);
    input.addEventListener("keydown", onKey);
    root.addEventListener("mousedown", function (e) {
      if (e.target === root) close();
    });
    list.addEventListener("click", function (e) {
      var li = e.target.closest("li[data-i]");
      if (li) choose(+li.getAttribute("data-i"), e.metaKey || e.ctrlKey || e.shiftKey);
    });
    list.addEventListener("mousemove", function (e) {
      var li = e.target.closest("li[data-i]");
      if (li && +li.getAttribute("data-i") !== active) select(+li.getAttribute("data-i"));
    });
  }

  function render() {
    var q = input.value.trim().toLowerCase();
    var src = DI.index || [];
    if (!q) items = src.filter(function (x) {
      return x.kind === "stop" || x.kind === "action";
    });
    else
      items = src
        .map(function (x) {
          var s = Math.max(score(q, x.label), score(q, (x.keys || "") + " " + x.kind + " " + (x.stop || "")) - 4);
          return { x: x, s: s };
        })
        .filter(function (r) {
          return r.s > 0;
        })
        .sort(function (a, b) {
          return b.s - a.s;
        })
        .slice(0, 40)
        .map(function (r) {
          return r.x;
        });
    list.innerHTML = "";
    if (!items.length) {
      list.innerHTML = '<li class="cmdk__empty">Nothing on the island matches that — try a fort, a year or a deck.</li>';
      input.removeAttribute("aria-activedescendant");
      return;
    }
    items.forEach(function (x, i) {
      var li = document.createElement("li");
      li.className = "cmdk__item";
      li.id = "cmdk-" + i;
      li.setAttribute("role", "option");
      li.setAttribute("data-i", i);
      li.innerHTML = '<span class="cmdk__time"></span><span class="cmdk__label"></span><span class="cmdk__kind"></span>';
      li.children[0].textContent = x.time || "";
      li.children[1].textContent = x.label;
      li.children[2].textContent = x.kind;
      list.appendChild(li);
    });
    select(0);
  }

  function select(i) {
    active = Math.max(0, Math.min(items.length - 1, i));
    Array.prototype.forEach.call(list.children, function (li, k) {
      li.setAttribute("aria-selected", k === active ? "true" : "false");
    });
    var cur = list.children[active];
    if (cur) {
      input.setAttribute("aria-activedescendant", cur.id);
      cur.scrollIntoView({ block: "nearest" });
    }
  }

  function choose(i, direct) {
    var x = items[i];
    if (!x) return;
    close(true);
    if (x.action === "now") return DI.goNow();
    if (x.action === "mode") return DI.setMode(DI.mode === "island" ? "classic" : "island");
    if (x.action === "copy") return DI.copyLink();
    if ((direct || !x.go) && x.href) {
      location.href = x.href;
      return;
    }
    DI.go(x.go);
  }

  function onKey(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      select(active + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      select(active - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(active, e.metaKey || e.ctrlKey || e.shiftKey);
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "Tab") {
      e.preventDefault(); // keep focus in the dialog
    }
  }

  function open() {
    if (!root) build();
    lastFocus = document.activeElement;
    root.hidden = false;
    DI.cmdk.isOpen = true;
    input.value = "";
    render();
    input.focus();
  }
  function close(keepFocus) {
    if (!root) return;
    root.hidden = true;
    DI.cmdk.isOpen = false;
    if (!keepFocus && lastFocus && lastFocus.focus) lastFocus.focus();
  }

  DI.cmdk = {
    open: open,
    close: close,
    toggle: function () {
      DI.cmdk.isOpen ? close() : open();
    },
    isOpen: false,
  };
})();
