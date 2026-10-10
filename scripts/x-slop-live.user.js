// ==UserScript==
// @name         X Slop Live (LocalJev + Groq)
// @namespace    localjev
// @version      1.1
// @description  Score X timeline live via LocalJev, fully cover slop as you scroll. CSP-safe via GM_xmlhttpRequest.
// @match        https://x.com/*
// @match        https://twitter.com/*
// @grant        GM_xmlhttpRequest
// @connect      127.0.0.1
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';
  const API = 'http://127.0.0.1:8080/v1/systemone';
  const QUESTIONS = {
    is_slop: {
      type: 'noul',
      instructions:
        'Is this X post low-effort AI slop, engagement bait, or copy-paste viral spam? True = slop. False = genuine human post with specific substance, opinion, or evidence.',
      criteria: {
        true: 'Generic AI thread, hustle platitude, engagement-bait question, or viral copy-pasta with no specific detail',
        false: 'Specific personal experience, data, code, or grounded opinion',
      },
    },
    slop_kind: {
      type: 'choice',
      instructions: 'If slop, what kind? If not slop, choose not_slop.',
      criteria: {
        not_slop: 'Genuine post',
        ai_thread: 'Generic AI-generated thread or listicle',
        engagement_bait: 'Bait question / like-farming / giveaway farming',
        copypasta: 'Repeated viral copypasta or stolen meme text',
      },
    },
  };

  if (!document.getElementById('xslop-style')) {
    const s = document.createElement('style');
    s.id = 'xslop-style';
    s.textContent =
      'article[data-testid="tweet"]{position:relative;overflow:hidden}' +
      'article[data-testid="tweet"].xslop-dim>*:not(.xslop-cover){filter:blur(14px);pointer-events:none;user-select:none}' +
      '.xslop-cover{position:absolute;inset:0;z-index:10;background:#0f0f0f;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;font:700 14px/1.4 system-ui;text-align:center;padding:16px}' +
      '.xslop-cover button{background:#fff;color:#000;border:0;border-radius:999px;padding:6px 14px;font-weight:700;cursor:pointer}';
    document.head.appendChild(s);
  }

  function badge(el, text) {
    el.querySelector('.xslop-cover')?.remove();
    el.classList.add('xslop-dim');
    const cover = document.createElement('div');
    cover.className = 'xslop-cover';
    const label = document.createElement('div');
    label.textContent = text;
    const btn = document.createElement('button');
    btn.textContent = 'Show anyway';
    btn.onclick = (e) => {
      e.stopPropagation();
      el.classList.remove('xslop-dim');
      cover.remove();
    };
    cover.append(label, btn);
    el.appendChild(cover);
  }

  // CSP-safe: runs in extension context, not page fetch
  function score(text) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: 'POST',
        url: API,
        headers: { 'Content-Type': 'application/json' },
        data: JSON.stringify({ model: 'jev-latest', state: { post: text }, questions: QUESTIONS }),
        onload: (res) => {
          try {
            const j = JSON.parse(res.responseText);
            resolve({ p: j.answers.is_slop.noul, kind: j.answers.slop_kind.choice });
          } catch (e) { reject(e); }
        },
        onerror: reject,
        ontimeout: () => reject(new Error('timeout')),
      });
    });
  }

  let queue = Promise.resolve();
  function sweep() {
    for (const el of document.querySelectorAll('article[data-testid="tweet"]')) {
      if (el.dataset.xslopSeen) continue;
      el.dataset.xslopSeen = '1';
      const text = (el.innerText || '').slice(0, 500);
      if (text.includes('\nAd\n')) { badge(el, 'AD'); continue; }
      queue = queue.then(async () => {
        try {
          const { p, kind } = await score(text);
          if (p >= 0.7) badge(el, `SLOP ${p.toFixed(2)} · ${kind}`);
        } catch (e) { console.warn('[xslop]', e); }
      });
    }
  }

  new MutationObserver(sweep).observe(document.body, { childList: true, subtree: true });
  sweep();
  console.log('[xslop-live] watching timeline. LocalJev must be running on 127.0.0.1:8080.');
})();
