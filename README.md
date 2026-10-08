# vijayjadi.com

Personal site of Vijay Jadi, enterprise architect. Built with Astro, Tailwind CSS, Archivo + Hanken Grotesk, GSAP (ScrollTrigger, SplitText, DrawSVG), Lenis, D3 and OGL. Hosted on Cloudflare Pages.

## Editing content

You never need to touch the design to change the words.

| What | Where |
|---|---|
| Hero text, about, facts, practice steps, domains, journey, credentials, contact details | `src/data/site.json` |
| Capability map (capabilities, cross-domain links, which case proves what) | `src/data/site.json` → `map` |
| Case studies | `src/content/work/*.md` — one file per case |
| Photos | `public/images/` |
| CV download | put your PDF at `public/cv/Vijay_Jadi_CV.pdf` |

To add a case study, copy any file in `src/content/work/`, change the text, and set `order`. Set `featured: true` to show it as a large card. Then add its slug to `map.work` in `site.json` so it appears on the capability map.

Commit the change on GitHub and Cloudflare publishes it in about a minute.

## Cloudflare Pages build settings

- Framework preset: **Astro**
- Build command: `npm run build`
- Build output directory: `dist`
- Node version: 22 (set by `.nvmrc`)

## Running it on your Mac (optional)

```
npm install
npm run dev
```

Then open http://localhost:4321.

## Motion

All motion respects the visitor's "reduce motion" setting. The pinned domains section only pins on screens at least 900 × 700; smaller screens get a stacked version. The gold hero light (OGL) and the capability map (D3) load only when needed.
