# MetaPase: Meta Global AI Developer Hackathon submission

**Track:** Build for Your World. A shopper's agent and every shop's agent negotiate, buy and restock on their own, in South African malls.

## The problem
Shoppers walk past dozens of stores and never learn which one would sell them what they want for less. Shops discount blindly, or not at all. MetaPase gives each side an agent. The shopper's agent finds offers within 50 m, haggles with the store's own agent, and either buys inside the shopper's limit or parks the deal for their OK. The store's agent protects its floor price, watches its stock, and suggests how to sell more.

## How it maps to the judging rubric

| Criterion | Evidence in this repo |
| --- | --- |
| **Impact (30%)** | Two-sided: shoppers save money and time, shops sell stock they would otherwise discount blindly. Works for 30 stores in 4 Johannesburg malls. |
| **Use of Meta AI tooling (25%)** | Muse Spark runs on **both sides of the same deal**: it chooses and words each store counter-offer, and turns a spoken or typed sentence into a wish. It also writes merchant insights. Every Muse answer is checked by code (see "Muse proposes, code decides"). The whole app can run on **Muse Spark Open** by changing three environment variables. |
| **Technical depth (20%)** | Typed end to end (`npm run typecheck`), guardrail tests against a mock that misbehaves on purpose (`npm test`), a circuit breaker, rate limiting, key redaction, stock-aware checkout, MongoDB with an in-memory fallback, a Vercel function for Muse. |
| **Demo (25%)** | Works with no server, no database and no key: open the page, press **Create my agent**, and watch. See `DEMO_SCRIPT.md` for a 3-minute video plan. |

## Muse proposes, code decides
- **Store agent:** Muse picks the counter. Code keeps it at or above the floor price and at or below the store's previous counter. A message that quotes any price the shopper doesn't already know is replaced, so the floor can't leak.
- **Shopper agent:** Muse turns "a smart blazer for a wedding under R1500, buy it automatically" into a wish. The shopper's own number overrides Muse's reading. Every field is validated.
- **Failure:** timeouts, errors, garbage and a paused circuit all fall back to the rules, and the badge in the header says which one is running.

## Run it on Muse Spark Open (open-weight bonus)
The guide says to use `meta-models/muse-spark-open-1026` on Baseten. Set these in `.env`:
```
MUSE_API_BASE=<the OpenAI-compatible base URL from your Baseten dashboard>
MODEL_API_KEY=<your Baseten key>
MUSE_MODEL=meta-models/muse-spark-open-1026
```
Then run `npm run muse:check`. JSON extraction already tolerates the reasoning text open-weight models emit before their answer. **This exact configuration has not been run yet**: check it before you rely on it.

## What was built during the hackathon (Oct 27 to Nov 4)
**Team: fill this in from your git history before submitting. The rules require judges to see what is new.**
Run `git log --since=2026-10-26 --format='%ad  %s' --date=short` and list the milestones here. If any part of the project existed before Oct 26, say so plainly and list what you added.

Added in the final push (Nov 3 to 4):
- Muse Spark integration: `server/muse.ts`, `api/muse/[action].ts`, `src/lib/muse.ts`, `scripts/muse-check.ts`, 15 guardrail tests.
- One-click agent creation: `src/components/AgentOnboarding.tsx`, `POST /api/user/agent/create`.
- In-browser merchant backend with stock, checkout, receipts and redemption for every store: `src/lib/demoStore.ts`.
- Stock-aware demo stores: sold-out items are never offered, and a payment takes a unit off the shelf.
- Merchant Hub: "Muse suggests" panel and an honest live/demo label. Negotiation rounds now show the store agent's words.
- Carousel fix (duplicate card IDs left cards stuck and overlapping) and a single buy-or-park policy for every agreed deal.
- Server `.env` loading, server typecheck, hardened wishlist auto-buy, generic demo seed data.

## Before you submit (deadline: Wed Nov 4, 9:00 PM ET)
- [ ] Claim your $150 Meta Model API credits (also due 9:00 PM ET) and add a card to your account.
- [ ] Repository is **public** and contains no secrets (`.env` is gitignored; rotate any key that was ever pasted into chat or a doc).
- [ ] 3-minute demo video recorded **with Muse live** and the link works without login.
- [ ] Live product URL works from a phone on mobile data.
- [ ] Everyone who worked on it is listed on the submission page.
- [ ] Optional bonuses: post the demo on X (Most Viral), mention Muse Spark Open (Best Build on Open Weight Models), highlight the agents (Best Agentic Use-Case).
