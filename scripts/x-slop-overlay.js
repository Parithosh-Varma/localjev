// X slop overlay — inject via browser.evaluate or bookmarklet.
// Usage: __markXSlop([{match: "first 80 chars of post", slop_p: 0.95, kind: "ai_thread"}])
// Adds a badge + dims slop posts (slop_p >= 0.7).
(function () {
  function ensureStyle() {
    if (document.getElementById("xslop-style")) return;
    const s = document.createElement("style");
    s.id = "xslop-style";
    s.textContent = `
      .xslop-badge { position:absolute; top:6px; right:8px; z-index:5;
        background:#dc2626; color:#fff; font:700 11px/1.4 system-ui;
        padding:2px 8px; border-radius:999px; }
      article[data-testid="tweet"].xslop-dim { opacity:.35; outline:2px solid #dc2626; outline-offset:-2px; }
      article[data-testid="tweet"] { position:relative; }`;
    document.head.appendChild(s);
  }
  window.__markXSlop = function (results, threshold = 0.7) {
    ensureStyle();
    const tweets = [...document.querySelectorAll('article[data-testid="tweet"]')];
    let marked = 0;
    for (const t of tweets) {
      const text = (t.innerText || "").slice(0, 400);
      const hit = results.find((r) => r.match && text.includes(r.match.slice(0, 40)));
      t.querySelector(".xslop-badge")?.remove();
      t.classList.remove("xslop-dim");
      if (hit && hit.slop_p >= threshold) {
        t.classList.add("xslop-dim");
        const b = document.createElement("div");
        b.className = "xslop-badge";
        b.textContent = `SLOP ${hit.slop_p.toFixed(2)}${hit.kind ? " · " + hit.kind : ""}`;
        t.appendChild(b);
        marked++;
      }
    }
    return { found: tweets.length, marked };
  };
  window.__clearXSlop = function () {
    document.querySelectorAll(".xslop-badge").forEach((e) => e.remove());
    document.querySelectorAll(".xslop-dim").forEach((e) => e.classList.remove("xslop-dim"));
    return "cleared";
  };
})();
