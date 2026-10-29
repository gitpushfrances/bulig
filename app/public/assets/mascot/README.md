# Ropi mascot images

Put the four Ropi poses here with exactly these names:

| File | Pose |
| --- | --- |
| `ropi-ready.webp` | Sitting, waving one paw |
| `ropi-friendly.webp` | Standing, tail up, big smile |
| `ropi-thinking.webp` | Paw on chin, looking up |
| `ropi-head.webp` | Head and shoulders, round crop |

Where each pose is used, and where Ropi must never appear, is in [docs/UI-UX.md](../../../../docs/UI-UX.md#mascot-ropi).

## Export rules

- **Transparent WebP**, a real alpha background (not a checkerboard drawn into the image). Check it on a light and a dark background.
- Character fully opaque. Trim empty space to a few pixels around the character.
- Longest side **480px**. Aim for 30–40 KB per file, never over 60 KB.
- No text, logos, floating icons, props, shadows or scenery in the image. The floating icons are drawn in code so they can move.
- Keep the big original PNGs out of the repo. Store them in Google Drive or the project files.

To convert a PNG: open it in [Squoosh](https://squoosh.app), choose WebP, quality about 80, resize to 480px on the longest side, and save with the name above.
