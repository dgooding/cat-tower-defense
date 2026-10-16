# Cat Tower Defense — project workspace

Working copy of the **9 Lives: Cat Tower Defense** website (in-game title *Catastrophe Defense*).
Live at <https://cat-tower-defense.com/>.

## Status

The source files did **not** exist on this machine — the paths in the project summary
(`~/workspace/your_files/...`) point at a different machine/workspace ("Phoenix"). The only
surviving copy was the deployed site itself, so this workspace was bootstrapped by fetching
the live files on 2026-10-16. See `_recovery/manifest.md` for sizes and checksums.

`site/tower-defense-game.html` = 97,336 bytes, an exact byte-count match to the summary's
"latest verified upload" (hosted **v19**), so this is the current live build.

## Layout

```
site/
  index.html               Landing page — 9 Lives: Cat Tower Defense + play link
  tower-defense-game.html  The game. Single self-contained HTML file (~97 KB, canvas art)
  plushie-lineup.html      Unlisted plushie lineup, 12 cats, canvas-generated PNG downloads
  ads.txt                  AdSense verification: pub-7621245571624166
docs/
  project-summary.md       Copy of the Drive project summary (source of record)
_recovery/
  manifest.md              Fetch date + sha256 for every recovered file
```

## Deploying

Porkbun **static hosting**, no backend. Deploy = upload the file.

- Overwrite `site/tower-defense-game.html` via the top-level **Upload** panel in Porkbun's file manager.
- **Do not** use Porkbun's delete / rename / raw-code-view buttons — they freeze automation.
  The TinyMCE visual editor is fine, but prefer the Upload panel.

## Open items (from the project summary)

- **AdSense approval** pending ("Requires review"). When Google decides, Daniel must
  connect a bank account, file US tax info, and pass identity/address verification — then the
  AdSense ad script goes into the game page `<head>` and the site is redeployed.
- **itch.io:** tick the **Graphics** box in the AI disclosure on the next listing update.
- **Narrow screens (≤860px):** shop becomes a horizontal snap-scroll strip — needs a real
  phone eyeball check; automation could not verify it visually.
- **Landing page** (`index.html`) is currently unformatted plain text with the play URL as
  literal text rather than a link.

## Notes

- Files under `docs/` and `_recovery/` are records, not deployed assets.
- Deployed files are exactly the four in `site/`.
