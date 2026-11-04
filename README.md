# Mandarin cards

Static flashcard app for learning Mandarin (Italian translations, English UI).
Vite + React + TypeScript, no backend, no stored progress.

**Status:** all milestones done — flashcards, sentences, browse, tag filters with URL state, installable offline PWA, CSV import, audio and stroke order.

## Run

```sh
npm install
npm run dev        # http://localhost:5173, also reachable on your network (see below)
npm test           # unit tests (validation, CSV import incl. the CLI, filters, search, URL state, shuffle)
npm run build      # typecheck + production build in dist/
npm run preview    # serve the production build
```

## Open it from another device (same network)

`npm run dev` and `npm run preview` listen on all network interfaces (`host: true` in `vite.config.ts`).
Vite prints a **Network** URL such as `http://192.168.1.20:5173/`; open that on your phone or tablet while it is on the same Wi-Fi.

If it doesn't load: allow Node/port 5173 through your computer's firewall, check the phone isn't on a guest network
or a router with "client isolation", and note that opening via a hostname (instead of the IP) needs
`server.allowedHosts` in `vite.config.ts`. Anyone on that network can reach the dev server while it runs.
Plain `http://` over the network is not a secure context, so the PWA install and service worker (next milestones)
only work on `localhost` or over HTTPS, e.g. once deployed to GitHub Pages.

## Install on phone / tablet, and offline use

The app is a PWA: after the first load it is cached completely (code, icons and `data.json`) and works with no connection.
It needs **HTTPS** (or `localhost`), so install it from the deployed site, not from the plain-`http://` LAN dev URL.

- **Android / Chrome:** menu ⋮ → *Install app* (or *Add to Home screen*).
- **iPhone / iPad (Safari):** Share → *Add to Home Screen*.
- **Desktop Chrome / Edge:** install icon in the address bar.

Updates: when you redeploy, the next time the app is opened online the new version downloads in the background and the page
reloads itself once, so new entries in `data.json` show up on every device. Bookmarked `?tags=…` links also open offline.

Implementation: `vite-plugin-pwa` (Workbox `generateSW`, dev dependency) with a relative `start_url`/`scope`, so it works under a
GitHub Pages sub-path. Icons are in `public/icons/` (`icon.svg` is the source; the PNGs were rendered from it, 192/512 plus a
maskable 512 and the iOS touch icon). To test the service worker locally use `npm run build && npm run preview`
(the dev server does not register it).

## Modes

| Mode | What it does |
| --- | --- |
| Study | Flashcards for characters **and** sentences together (`mode=study`), with a "Pinyin on front" toggle that applies to every card. |
| Browse | Searchable list of the characters and sentences with their tags (`mode=browse`). |

The **Characters / Sentences** buttons at the top of the filter panel choose which kinds of card are shown, in both modes. Both are
on by default; at least one always stays on (`types=characters` or `types=sentences` in the URL). Old `mode=cards` and
`mode=sentences` links still work.

Browse search ignores tone marks, accents and case (`ni`, `nǐ`, `nihao`, `perche` all work), matches hanzi, traditional, pinyin,
Italian and tags, and needs every word to match. The tag filter applies in Browse too. The search text is not stored in the URL.

## Controls

| Input | Flip | Previous / next |
| --- | --- | --- |
| Touch | tap the card | swipe right / left |
| Mouse | click the card | Previous / Next buttons |
| Keyboard | Space | ← / → |

"Shuffle" is on by default, so the app opens on a random card; it randomises the order (reshuffled after each full pass) and can be turned off for the original order. "Italian first" shows the Italian on the front.

## Tag filters and URL state

Chips are built from the tags in the data and grouped by prefix: the leading letters before a digit or `-`
(`lezione-1a` → Lezione); tags containing a dot are the grammatical classes of the textbook glossary (`sost.`, `avv.`,
`pron. inter.`, `num.`, …) and form the **Classe grammaticale** group; everything else goes under Other. Chips show how many
cards have the tag.

- Select several tags and choose **Match all** (AND) or **Match any** (OR). Nothing selected = all cards.
- The panel header shows the live count ("12 of 20 cards"). With zero matches you get shortcuts to "Match any" / "Clear filters".
- Changing the filter restarts from the first card; Shuffle and Italian-first are kept.
- The filter panel collapses with the **Filters** button at every size: bottom sheet on phones (< 768px), side panel on tablets and desktop. It starts open on desktop (≥ 1100px) and closed on smaller screens.
- The tag filter is shared by all modes. Chips list every tag in the data, with counts for the current mode; a dashed chip has no cards in this view.

The selection lives only in the query string, so a study set can be bookmarked and opened on any device:

```
?tags=sost.,lezione-1a&match=all&mode=study&types=characters
```

Tags in the URL that don't exist in the data stay visible as dashed chips with count 0 (so a stale bookmark never changes
the set silently). Nothing is stored in localStorage.

## Data

Single source of truth: `public/data/data.json`, with two arrays, `characters` and `sentences`.
`data.schema.json` next to it gives your editor autocompletion and validation (referenced via `"$schema"`).

| Field | Required | Notes |
| --- | --- | --- |
| `hanzi` | yes | Simplified. Must be unique within its array. Multi-character words are allowed. |
| `pinyin` | yes | Tone marks (`nǐ`), not numbers (`ni3`). |
| `italian` | yes | Array; the first item is the primary meaning. |
| `tags` | no | Array, case-insensitive (stored lowercase), e.g. `pron. pers.`, `lezione-1a`. No commas (they separate tags in the URL). |
| `notes` | no | Free text shown on the back. |
| `traditional` | no | Traditional form, shown on the back. |

```json
{ "hanzi": "你", "pinyin": "nǐ", "italian": ["tu", "ti", "te"], "tags": ["pron. pers.", "lezione-1a"] }
```

On load the file is validated with Zod (`src/data/schema.ts`). Invalid entries, unknown keys and duplicate hanzi are
**skipped and listed in a banner** — the app keeps working with the rest. Duplicates are detected by hanzi only; the first one wins.

`characters` and `sentences` are shown together, and the Characters / Sentences filter narrows them. Duplicates are checked within each array.

## Audio

The round speaker button on a card reads the hanzi aloud (Web Speech API, Mandarin, slightly slower than natural speech).
Tap it again while it plays to stop; moving to another card or leaving the mode stops it too. It does not flip the card.
In *Italian first* mode the button only appears once the card is flipped, so it doesn't give the answer away.

The speech comes from voices installed on **your device**, so nothing is downloaded by the app and it works in the installed PWA.
The button is shown whenever the browser supports speech, even if it lists no Mandarin voice (mobile browsers often list voices late or not at all): it then asks the engine for zh-CN and the button shows its warning state if that fails. Cantonese voices are
never used. To get a voice: iOS/iPadOS *Settings → Accessibility → Spoken Content → Voices → Chinese*; Android *Settings → System →
Languages → Text-to-speech output* (Google TTS, Chinese data); Windows *Settings → Time & language → Speech → Add voices*;
macOS *System Settings → Accessibility → Spoken Content → System voice → Manage voices*.
Device-local voices are preferred because browser "network" voices (some Chrome voices) don't work offline; if one fails the
button shows a warning state and a tap retries. The pronunciation of characters with several readings (e.g. 了, 行) is up to the voice.

## Stroke order

The hanzi on a card is drawn from the stroke data, one drawing area per character (a single character sits on a practice-paper
guide). Tap the **play button** at the top left of the card to watch it written stroke by stroke, in order; tap it again to stop.
In *Italian first* mode the drawing, and the play button, are on the back. Flipping the card or moving to another one stops the
animation. Punctuation and characters without stroke data are shown as plain text, and the play button is hidden when none of the
characters has stroke data. The button is separate from the card, so it never flips it.

How it works offline: `npm run dev` / `npm run build` first run `scripts/build-strokes.ts`, which copies the
[hanzi-writer-data](https://github.com/chanind/hanzi-writer-data) files for **only the characters used in `data.json`** into
`public/strokes/` (generated, git-ignored; `npm run strokes` runs it by hand, e.g. after a CSV import). They are precached by the
service worker, and the Hanzi Writer code is a separate chunk loaded on the first flip, so it works offline too.

Credits: [Hanzi Writer](https://hanziwriter.org) is MIT licensed. Its stroke data comes from
[Make Me a Hanzi](https://github.com/skishore/makemeahanzi), extracted from Arphic Technology fonts, and is distributed under the
Arphic Public License (see `node_modules/hanzi-writer-data/README.md`), which applies to the files in `public/strokes/`.

## Deploy

The build output (`npm run build` → `dist/`) is a plain static site that uses relative paths, so it works at the root of a domain
or under a sub-path such as `https://you.github.io/mandarin-cards/`.

**GitHub Pages (included):** push the repository to GitHub, then *Settings → Pages → Build and deployment → Source: GitHub Actions*.
`.github/workflows/deploy.yml` installs, runs the tests, builds and publishes on every push to `main`. After editing `data.json`
just commit and push; installed copies of the app pick up the new version the next time they are opened online.

**Netlify / Vercel / any static host:** build command `npm run build`, publish directory `dist`. No server configuration or
redirects are needed (there is no client-side routing; filters live in the query string).

## Adding entries

### By hand (JSON)

Edit `public/data/data.json` (your editor autocompletes and validates it through `data.schema.json`) and add an object to
`characters` or `sentences` as described above. A reload (or the dev server's hot reload) picks it up; typos show up in the
banner on the page instead of breaking anything.

### In bulk (CSV)

```sh
npm run import:csv -- path/to/file.csv             # merge into public/data/data.json
npm run import:csv -- path/to/file.csv --dry-run   # show what would happen, change nothing
npm run import:csv -- path/to/file.csv --data other.json
```

```csv
type,hanzi,pinyin,italian,tags
character,爱,ài,amare;amore,v.;lezione-4c
sentence,明天见！,míngtiān jiàn!,A domani!,lezione-5c
```

`sample-data/sample.csv` mirrors the current `data.json` (unit 1, lessons 1a–1d, with a `notes` column), so importing it into an
empty list rebuilds the data. The previous list is kept as `sample-data/data.OLD.json` and `sample-data/sample.OLD.csv`.

| Column | Required | Notes |
| --- | --- | --- |
| `type` | yes | `character` or `sentence` |
| `hanzi` | yes | |
| `pinyin` | yes | Tone marks (`nǐ`), not numbers (`ni3`). |
| `italian` | yes | `;` separates several meanings; the first is primary. |
| `tags` | no | `;` separates tags (case-insensitive, no commas). The cell may be left empty or omitted. |
| `notes`, `traditional` | no | Optional extra columns; add them to the header if you need them. |

How the import behaves:

- Comma-separated, **UTF-8**. Put quotes around a cell that contains a comma (`"bene, bravo"`). Column order follows your header.
- Duplicates are detected by **hanzi only**, separately for characters and sentences. Entries already in `data.json` are never
  modified (edit them by hand if you want to change them), and the same hanzi twice in one CSV keeps the first.
- Invalid rows (bad `type`, numeric pinyin, missing cells, unbalanced quotes, …) are skipped and listed with their line number;
  the valid rows are still imported. A summary of what was added and skipped is printed.
- Running the same file twice is harmless: the second run adds nothing and does not touch the file.
- The file is written atomically, one entry per line, so diffs stay readable. `$schema` and unknown top-level keys are preserved.

Spreadsheet tips: in Excel save as **CSV UTF-8 (Comma delimited)**; in LibreOffice choose *Text CSV*, character set *Unicode (UTF-8)*,
field delimiter `,`. Excel with an Italian locale often writes `;` between columns, which clashes with the `;` used inside cells: the
script detects that and tells you to export again with commas. A file in the wrong encoding is rejected with a message instead of
importing garbled text.

After importing, commit `data.json` and redeploy; installed copies of the app update themselves.

## Layout

```
src/data/        schema (Zod), validation, loading, CSV parsing/merging
scripts/         import-csv.ts (the `import:csv` command)
sample-data/     sample.csv
src/filter/      AND/OR matching, tag grouping, search (pure)
src/url/         query-string state (parse/serialize + hook)
src/lib/         pure helpers and hooks (shuffle, speech, stroke data/layout, writer wrapper)
src/components/  Flashcard, HanziStrokes, SpeakButton, StrokeButton, StudyView, BrowseView, FilterPanel, ModeNav, NoMatches, DataIssues
```
