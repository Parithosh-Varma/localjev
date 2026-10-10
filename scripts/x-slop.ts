import { loadSettings } from "../src/config";
import { Engine } from "../src/engine";
import type { Question } from "../src/types";

export const SLOP_QUESTIONS: Record<string, Question> = {
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

export async function scorePosts(texts: string[]) {
  const settings = loadSettings();
  const engine = new Engine(settings);
  const out = [];
  for (const [i, text] of texts.entries()) {
    let r;
    for (let attempt = 0; ; attempt += 1) {
      try {
        if (i > 0) await new Promise((ok) => setTimeout(ok, 2_500));
        r = await engine.decide(
          SLOP_QUESTIONS,
          { post: text },
          (Date.now() % 2 ** 31) + i * 104729,
        );
        break;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes("429") && attempt < 5) {
          await new Promise((ok) => setTimeout(ok, 8_000 * (attempt + 1)));
          continue;
        }
        throw e;
      }
    }
    const slop = r.answers.is_slop;
    const kind = r.answers.slop_kind;
    out.push({
      text: text.slice(0, 80),
      slop_p: slop?.type === "noul" ? slop.noul : null,
      kind:
        kind?.type === "choice"
          ? { label: kind.choice, p: kind.probabilities[kind.choice] }
          : null,
    });
  }
  return out;
}

if (import.meta.main) {
  const samples = [
    "🚨🚨 10 ChatGPT prompts that will make you $10k/month 🧵👇 1/10 ... (generic hustle thread)",
    "Just shipped localjev on Groq gpt-oss-20b: p50 0.26s, strict json_schema works if you drop chat_template_kwargs. Diff in src/engine.ts:418",
    "REPLY with 'YES' and I'll DM you the secret crypto gem 💎🚀 100x guaranteed!!",
    "Spent 3h debugging why oMLX DiffusionGemma logits differ from prompted probabilities. TL;DR: prompted self-report != logit read. Bake-off in docs/evaluation-results-2026-09-18.md",
  ];
  console.log(JSON.stringify(await scorePosts(samples), null, 2));
}
