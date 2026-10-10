// X Slop Marker — self-serve bookmarklet. No opencode needed.
// Prereq: LocalJev running on this machine (bun run start → http://127.0.0.1:8080).
// Use: paste this file's contents into the DevTools console on x.com/home,
// or save as a bookmarklet (URL = javascript:<minified body>).
// It scores each visible tweet via LocalJev and dims slop (p >= 0.7).
(async function () {
  const API = "http://127.0.0.1:8080/v1/systemone";
  const QUESTIONS = {
    is_slop: {
      type: "noul",
      instructions:
        "Is this X post low-effort AI slop, engagement bait, or copy-paste viral spam? True = slop. False = genuine human post with specific substance, opinion, or evidence.",
      criteria: {
        true: "Generic AI thread, hustle platitude, engagement-bait question, or viral copy-pasta with no specific detail",
        false: "Specific personal experience, data, code, or grounded opinion",
      },
    },
    slop_kind: {
      type: "choice",
      instructions: "If slop, what kind? If not slop, choose not_slop.",
      criteria: {
        not_slop: "Genuine post",
        ai_thread: "Generic AI-generated thread or listicle",
        engagement_bait: "Bait question / like-farming / giveaway farming",
        copypasta: "Repeated viral copypasta or stolen meme text",
      },
    },
  };

  if (!document.getElementById("xslop-style")) {
    const s = document.createElement("style");
    s.id = "xslop-style";
    s.textContent =
      ".xslop-badge{position:absolute;top:6px;right:8px;z-index:5;background:#dc2626;color:#fff;font:700 11px/1.4 system-ui;padding:2px 8px;border-radius:999px}" +
      'article[data-testid="tweet"].xslop-dim{opacity:.35;outline:2px solid #dc2626}' +
      'article[data-testid="tweet"]{position:relative}';
    document.head.appendChild(s);
  }

  function badge(el, text) {
    el.querySelector(".xslop-badge")?.remove();
    el.classList.add("xslop-dim");
    const b = document.createElement("div");
    b.className = "xslop-badge";
    b.textContent = text;
    el.appendChild(b);
  }

  async function score(text) {
    const r = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "jev-latest", state: { post: text }, questions: QUESTIONS }),
    });
    if (!r.ok) throw new Error("LocalJev HTTP " + r.status);
    const j = await r.json();
    return { p: j.answers.is_slop.noul, kind: j.answers.slop_kind.choice };
  }

  async function sweep() {
    for (const el of document.querySelectorAll('article[data-testid="tweet"]')) {
      if (el.dataset.xslopSeen) continue;
      el.dataset.xslopSeen = "1";
      const text = (el.innerText || "").slice(0, 500);
      if (text.includes("\nAd\n")) {
        badge(el, "AD");
        continue;
      }
      try {
        const { p, kind } = await score(text);
        if (p >= 0.7) badge(el, `SLOP ${p.toFixed(2)} · ${kind}`);
      } catch (e) {
        console.warn("[xslop]", e);
      }
    }
  }

  if (!window.__xslopObs) {
    window.__xslopObs = new MutationObserver(sweep);
    window.__xslopObs.observe(document.body, { childList: true, subtree: true });
  }
  await sweep();
  console.log("[xslop] watching timeline — new posts score as they render. Run window.__xslopObs.disconnect() to stop.");
})();
