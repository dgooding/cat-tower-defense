# Cat Tower Defense — website & game

Working copy of the **9 Lives: Cat Tower Defense** site (in-game title *Catastrophe Defense*).
Live at <https://cat-tower-defense.com/>.

## Deploying

Deployment is fully automated via **Porkbun Static Hosting ← GitHub Connect**.

```
edit files here  →  git commit  →  git push  →  live in ~10–70s
```

Repo root **is** the web root, so `index.html`, `tower-defense-game.html`,
`plushie-lineup.html` and `ads.txt` sit at the top level. Nothing else is published.

```bash
git add -A && git commit -m "describe change" && git push
```

Verify what's actually live:

```bash
curl -s https://cat-tower-defense.com/tower-defense-game.html | shasum -a 256
```

Remote: <https://github.com/dgooding/cat-tower-defense> (branch `main`).
Upload limit on static hosting is 40 MB; the whole site is ~112 KB.

### Keeping files out of the deployed tree

Anything committed here is publicly fetchable. `docs/` and `_recovery/` are **gitignored**
and hold local-only material (account details, invoice URLs, build records). Don't commit them.

## Layout

```
index.html               Landing page — 9 Lives: Cat Tower Defense + play link
tower-defense-game.html  The game. Single self-contained HTML file (~97 KB, canvas art)
plushie-lineup.html      Unlisted plushie lineup, 12 cats, canvas-generated PNG downloads
ads.txt                  AdSense verification
```

Local-only: `docs/project-summary.md` (source of record), `docs/deploy-setup.md`,
`_recovery/manifest.md`.

## The game

Single self-contained HTML file, no backend, no build step. 12 cat towers, 11 enemy types,
99 waves, 9 lives, 5 rotating map rooms (new battlefield every 5 waves, towers auto-refund
70%), 3 difficulty tiers. All art is drawn programmatically to canvas — no image assets.

## Open items

- **AdSense approval** pending ("Requires review"). When Google decides, bank account, US tax
  info and identity verification are Daniel's steps — then the ad script goes in the game
  page `<head>` and gets pushed.
- **itch.io:** tick the **Graphics** box in the AI disclosure on the next listing update.
- **Narrow screens (≤860px):** shop becomes a horizontal snap-scroll strip — needs a real
  phone check.
- **Landing page** (`index.html`) is bare unstyled text with the play URL as literal text.

## History

The original source files referenced by the project summary (`~/workspace/your_files/...`)
were not present on this machine; this workspace was bootstrapped on 2026-10-16 by fetching
the deployed site, which matched the summary's verified hosted **v19** byte count exactly.
See `_recovery/manifest.md`.
