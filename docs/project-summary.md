# Cat Tower Defense — Website Project Summary

Everything done for the cat tower defense website, in one place.
Compiled October 16, 2026.

---

## The website

- **Domain:** cat-tower-defense.com
- **Landing page:** https://cat-tower-defense.com/ — "9 Lives: Cat Tower Defense" branding with a play link
- **Game:** https://cat-tower-defense.com/tower-defense-game.html — the playable game (in-game title: *Catastrophe Defense*)
- **Plushie lineup (unlisted):** https://cat-tower-defense.com/plushie-lineup.html — all 12 cats with high-res PNG downloads for manufacturers

## Domain (Porkbun)

- **Registered:** October 14, 2026 — 1-year term for **$11.08**
- **Expires:** October 14, 2027 — **auto-renew is ON**
- **Account:** `dgooding486` / daniel.gooding@gmail.com — Daniel created the account himself and paid with his own card during a browser takeover (phone 719-396-4676 used at signup)
- **Order #:** 12113268 — invoice: https://porkbun.com/account/orders/12113268/invoice
- **WHOIS privacy:** free, ON
- **DNS:** untouched — static hosting only, no DNS changes made

## Hosting & deployment

- **Hosting:** Porkbun static hosting — no server, no backend; the game is a single self-contained HTML file
- **Deploying = one file upload:** overwrite `tower-defense-game.html` using the top-level **Upload** panel in Porkbun's file manager
- **Porkbun editor quirk (discovered the hard way):** the delete, rename, and raw-code-view buttons freeze automation — always use the Upload panel. The TinyMCE visual editor works fine.
- **`ads.txt`** is in place at the domain root for AdSense verification: `google.com, pub-7621245571624166, DIRECT, f08c47fec0942fa0`
- **Latest verified upload:** 97,336 bytes on October 14, 2026 (~11:11 UTC) — hosted version v19

## The game (summary)

- **Public name:** 9 Lives: Cat Tower Defense — **in-game title:** *Catastrophe Defense*
- **Current version:** hosted v19 (internal feature version V12), verified live with full interaction smoke tests
- **12 cat towers** (Hairball Hurler, Laser Pointer, Catnip Mortar, Grumpy Cat, Box Fortress, Treat Baker, Yarn Trapper, Looong Boi, DJ Whiskers, Tuna Reaper, Static Cling, Cat Burglar), **11 enemy types**, **99 waves**, 9 lives, Lucky Collar mercy system
- **5 rotating map rooms** (Living Room → Kitchen → Bedroom → Bathroom → Attic) — new battlefield every 5 waves; towers auto-refund 70% at wave-clear and the player rebuilds during intermission
- **3 difficulty tiers** — tap a card to start immediately: 😻 Casual (0.85× enemy HP, 1.25× treats, 250 treats), 🙀 Crazy (standard, 200 treats), 😾 Feral (1.3× enemy HP, 0.8× treats, 150 treats)
- Full version-by-version build history lives in the Drive build log: **"Catastrophe Defense — Build Log.md"**

## Publishing

- **itch.io:** https://dgooding486.itch.io/9-lives-cat-tower-defense — account `dgooding486` (created by Daniel himself); free / $0-or-donate listing
- **Muse.ai share:** https://muse.ai/s/tower-defense-game-xqxd6sxahxhxmkp4
- **AI disclosure:** filed with Code, Text & Dialog, and Sounds checked. The **Graphics** box should be checked on the next listing update (the art is now AI-assisted programmatic graphics, not just code-drawn)

## AdSense (ad revenue pipeline)

- **Google account:** daniel.gooding@gmail.com
- **Publisher ID:** `pub-7621245571624166` · **Customer ID:** `3934064753`
- **History:** Daniel's AdSense account dated to a YouTube-hosted account deactivated Dec 2021 for inactivity (*not* a policy violation), which had no Sites section — that's what drove the domain purchase. Upgraded October 14, 2026 to a full AdSense account via the signup flow: it detected the existing publisher ID, created no duplicate account, asked for no personal info.
- **Site submitted:** cat-tower-defense.com added October 14, 2026 ~1:28 AM MDT — status **"Requires review"** (Google usually decides in a few days, can take 2–4 weeks)
- **Ownership verified** via `ads.txt`
- **Watch:** a daily Gmail check is active; Daniel gets pinged only when Google makes a decision
- **After approval (Daniel's steps):** ① connect bank account in AdSense → Payments, ② submit US tax info, ③ identity/address verification — then Phoenix embeds the AdSense ad script in the game page `<head>` and redeploys

## Costs

| Item | Cost |
|---|---|
| Domain (1 year, Porkbun) | $11.08 |
| Hosting (Porkbun static) | free |
| itch.io listing | free |
| AdSense | free |
| **Total out-of-pocket** | **$11.08** |

## Accounts & access

- **Porkbun:** `dgooding486` — Daniel's account, his card
- **itch.io:** `dgooding486` — Daniel's account
- **AdSense:** daniel.gooding@gmail.com — Daniel's account
- Note: Phoenix can't pass identity checks — logins, verifications, and payments are Daniel's steps; Phoenix does the labor around them

## Source files (Phoenix workspace)

- Game source: `~/workspace/your_files/tower-defense-game/tower-defense-game.html`
- Plushie page source: `~/workspace/plushie-lineup/plushie-lineup.html`
- Build log (this Drive): "Catastrophe Defense — Build Log.md"
- Design research: `~/workspace/tower-defense-game/td-design-playbook.md`

## Open items

- **AdSense approval** pending — daily watch active; Daniel gets one ping with his three steps (bank info, tax form, identity verification) when Google decides
- **itch.io:** check the Graphics box in the AI disclosure on the next listing update
- **Narrow screens (≤860px):** the shop becomes a horizontal snap-scroll strip — needs Daniel's eyeball check on his phone (automation couldn't verify it visually)
- **After AdSense approval:** Phoenix adds the ad script to the game page `<head>` and redeploys
