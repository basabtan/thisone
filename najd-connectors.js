(function () {
  var rootNode = null;

  function waitRoot(cb) {
    if (document.querySelector(".columns") && document.querySelector("[data-node-id]")) {
      rootNode = window.__NAJD_ROOT__ || null;
      cb();
      return;
    }
    requestAnimationFrame(function () {
      waitRoot(cb);
    });
  }

  function vb(svg) {
    var b = svg.viewBox.baseVal;
    return { width: b.width || 1900, height: b.height || 760 };
  }

  function pt(id, overlay) {
    var pill = document.querySelector('[data-node-id="' + id + '"] .pill');
    if (!pill) return null;
    var br = pill.getBoundingClientRect();
    var sr = overlay.getBoundingClientRect();
    var v = vb(overlay);
    var sx = v.width / sr.width;
    var sy = v.height / sr.height;
    return {
      xL: (br.left - sr.left) * sx,
      xR: (br.right - sr.left) * sx,
      y: (br.top - sr.top + br.height / 2) * sy,
    };
  }

  function syncOverlayBox(overlay) {
    var stage = document.querySelector(".stage");
    var cols = document.querySelector(".columns");
    if (!stage || !cols) return false;
    var cr = cols.getBoundingClientRect();
    var sr = stage.getBoundingClientRect();
    overlay.style.position = "absolute";
    overlay.style.left = cr.left - sr.left + stage.scrollLeft + "px";
    overlay.style.top = cr.top - sr.top + stage.scrollTop + "px";
    overlay.style.width = cr.width + "px";
    overlay.style.height = cr.height + "px";
    overlay.style.pointerEvents = "none";
    return true;
  }

  function ensureOverlay() {
    var stage = document.querySelector(".stage");
    var base = document.querySelector("svg.lines");
    if (!stage || !base) return null;
    var ov = document.querySelector("svg.lines-overlay");
    if (!ov) {
      ov = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      ov.setAttribute("class", "lines lines-overlay");
      ov.setAttribute("preserveAspectRatio", "xMinYMid meet");
      stage.appendChild(ov);
    }
    ov.setAttribute("viewBox", base.getAttribute("viewBox") || "0 0 1900 760");
    if (!syncOverlayBox(ov)) return null;
    return ov;
  }

  function edges() {
    rootNode = window.__NAJD_ROOT__ || rootNode;
    var out = [];
    function walk(n) {
      if (!document.querySelector('[data-node-id="' + n.id + '"]')) return;
      (n.children || []).forEach(function (c) {
        if (document.querySelector('[data-node-id="' + c.id + '"]')) {
          out.push({ from: n.id, to: c.id });
          walk(c);
        }
      });
    }
    if (rootNode) walk(rootNode);
    return out;
  }

  function pathTree(parent, children, overlay) {
    var p = pt(parent, overlay);
    if (!p) return "";
    var cs = children
      .map(function (c) {
        return pt(c, overlay);
      })
      .filter(Boolean);
    if (!cs.length) return "";
    var bus = p.xR + Math.min(52, Math.max(28, (cs[0].xL - p.xR) * 0.45));
    if (cs.length === 1) {
      var c = cs[0];
      return "M " + p.xR + " " + p.y + " H " + bus + " V " + c.y + " H " + c.xL;
    }
    var ys = cs.map(function (c) {
      return c.y;
    });
    var d = Math.min.apply(null, ys);
    var f = Math.max.apply(null, ys);
    var parts = ["M " + p.xR + " " + p.y + " H " + bus, "M " + bus + " " + d + " V " + f];
    cs.forEach(function (c) {
      parts.push("M " + bus + " " + c.y + " H " + c.xL);
    });
    return parts.join(" ");
  }

  function redraw() {
    var overlay = ensureOverlay();
    if (!overlay) return;
    overlay.innerHTML = "";
    var groups = {};
    edges().forEach(function (e) {
      if (!groups[e.from]) groups[e.from] = [];
      groups[e.from].push(e.to);
    });
    Object.keys(groups).forEach(function (from) {
      var d = pathTree(from, groups[from], overlay);
      if (!d) return;
      var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("class", "branch-line");
      path.setAttribute("d", d);
      path.setAttribute("stroke-width", "2.8");
      path.setAttribute("opacity", "0.72");
      overlay.appendChild(path);
      var p = pt(from, overlay);
      if (p) {
        var j = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        j.setAttribute("class", "junction");
        j.setAttribute("cx", p.xR);
        j.setAttribute("cy", p.y);
        j.setAttribute("r", "4.6");
        overlay.appendChild(j);
      }
      groups[from].forEach(function (to) {
        var c = pt(to, overlay);
        if (c) {
          var ji = document.createElementNS("http://www.w3.org/2000/svg", "circle");
          ji.setAttribute("class", "junction");
          ji.setAttribute("cx", c.xL);
          ji.setAttribute("cy", c.y);
          ji.setAttribute("r", "4.6");
          overlay.appendChild(ji);
        }
      });
    });
  }

  function schedule() {
    requestAnimationFrame(function () {
      requestAnimationFrame(redraw);
    });
  }

  function boot() {
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        redraw();
        schedule();
        var root = document.getElementById("root");
        if (root) {
          new MutationObserver(schedule).observe(root, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["style", "class"],
          });
        }
        window.addEventListener("resize", schedule);
        var stage = document.querySelector(".stage");
        if (stage) stage.addEventListener("scroll", schedule, { passive: true });
        setInterval(schedule, 250);
      });
    });
  }

  waitRoot(boot);
  window.addEventListener("load", function () {
    redraw();
  });
  window.redrawNajdConnectors = redraw;
  window.__NAJD_CONNECTOR_BOOT__ = true;
})();
