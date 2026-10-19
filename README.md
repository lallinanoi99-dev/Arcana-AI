# ArcanAI

A calm, modern AI tarot reader. Ask a question, choose a spread, and the cards are shuffled and drawn inside a BOT Chain contract, so nobody can fake them. Then AI reads them like a real tarot reader.

*For reflection and fun, not a prediction. No tokens, no payments, no admin, no personal data.*

## Status

| | |
|---|---|
| Live site | https://arcana-ai.space (GitHub Pages: https://lallinanoi99-dev.github.io/Arcana-AI/) |
| AI Worker | _not deployed yet_ |
| Contract (BOT Chain mainnet, chain ID 677) | [`0x8dF451bcdB17B909b707aa1fbCc8f8900fAeE1c7`](https://scan.botchain.ai/address/0x8dF451bcdB17B909b707aa1fbCc8f8900fAeE1c7) (deployed from Remix, solc 0.8.34) |
| Contract (testnet, chain ID 968) | _not deployed yet_ |

## Project layout

- `index.html`: the whole frontend (ethers.js v6 from CDN, no build step)
- `cards.json`: all 78 cards (name, arcana, suit, number, element, upright and reversed keywords and meaning, art file)
- `cards/`: our own minimal line-art deck (`00.svg` The Fool … `77.svg` King of Pentacles, plus `back.svg`)
- `contracts/ArcanAI.sol`: the contract (Solidity ^0.8.20)
- `deploy.html`: one-click deploy from MetaMask, testnet or mainnet
- `build/`: compiled ABI and bytecode, plus the standard JSON input for explorer verification
- `worker/`: the AI proxy (Cloudflare Worker, `POST /tarot`)
- `tools/`: scripts that generate the deck, compile and test the contract, and check the frontend against it
- `images/`: the BOT Chain logo for the footer

## Run locally

```bash
python3 -m http.server 4608
```

Then open http://localhost:4608. Two things are switched off until you configure them, and the site stays fully usable without either:

- **No contract address** → *preview mode*: draws, the Daily Pull streak and My readings are simulated in this browser's localStorage (seeded with three demo readings), so every screen can be reviewed before deploying. Without MetaMask it uses a preview wallet. Add `?reset` to start over.
- **No AI Worker URL** → readings are built from `cards.json` meanings plus position templates, labelled "Classic meanings". The same fallback is used when the AI fails or takes longer than 8 seconds.

Both are set in the `CONFIG` block at the top of the script in `index.html`.

## 1. Deploy the contract

Compiled with Solidity 0.8.20, optimizer 200 runs, EVM `paris`. The constructor takes no arguments.

1. Run the site locally and open http://localhost:4608/deploy.html in a browser with MetaMask.
2. Click **Deploy to Testnet (968)**, confirm in MetaMask, then try the app at http://localhost:4608/?net=testnet. On localhost the app picks up the address you just deployed.
3. Click **Deploy to Mainnet (677)**.
4. Paste each address into the matching `contract: ''` field in `CONFIG.networks` in `index.html`, and into the Status table above. The mainnet `contract` is the one constant that feeds the app, the footer address and the explorer link.

Or use Remix: paste `contracts/ArcanAI.sol` into https://remix.ethereum.org, compile with 0.8.20 and EVM version `paris`, deploy with *Injected Provider – MetaMask*.

| Network | Chain ID | RPC | Explorer |
|---|---|---|---|
| Testnet | 968 | https://rpc.bohr.life | https://scan.bohr.life |
| Mainnet | 677 | https://rpc.botchain.ai | https://scan.botchain.ai |

To verify a contract deployed from `deploy.html`, use "Standard JSON input" with `build/ArcanAI.standard-input.json` and compiler `v0.8.20+commit.a1b79de6`. The mainnet contract above was deployed from Remix with solc 0.8.34, so verify it with the same compiler version and settings used in Remix.

## 2. Deploy the AI Worker

The Worker holds the Anthropic API key as a secret, so it never reaches the browser.

```bash
cd worker
npm install
npx wrangler login
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler deploy
```

Before deploying, edit `worker/wrangler.toml`:

- `ALLOWED_ORIGINS`: your live site origin(s), comma-separated, no trailing slash. Requests from any other origin get a 403.
- `MODEL`: the Claude model that writes the readings. The default is `claude-opus-5-5` at low effort; `claude-haiku-5-5` is the cheapest option.

Then paste the Worker URL plus `/tarot` into `CONFIG.aiUrl` in `index.html`.

The Worker limits each IP to 30 readings per hour (bind a KV namespace as `RATE_KV` to make the limit hold across instances). On the larger models it turns on Anthropic's server-side refusal fallback.

**Shared Worker from Week 1:** `POST /tarot` is self-contained. To merge it into the shared Worker, copy `read()`, its helpers and the `/tarot` branch of `fetch` into that Worker, and bundle `cards.json` next to it (the route imports it). The rate limiter and CORS helpers are the same pattern as before.

## 3. Publish the site

GitHub Pages serves the `gh-pages` branch, so publish with `git push origin main:gh-pages` after pushing `main` (or switch the Pages source to `main` under Settings → Pages). For a custom domain, add it under Settings → Pages, which creates the `CNAME` file. Remember to add the final origin to `ALLOWED_ORIGINS` and redeploy the Worker.

## How it works

- **Draw:** `draw(spread, questionHash)` with `Spread { Daily, ThreeCard }`. The contract mixes `block.prevrandao`, the previous block hash, the sender, a per-wallet nonce and the reading count, then picks distinct cards from 0–77 (re-rolling a repeat) and an upright/reversed flag per card. Good enough for a reflection game, not for anything of value.
- **Daily Pull:** one per wallet per UTC day (`block.timestamp / 1 days`), else `AlreadyDrewToday`. The streak goes +1 if yesterday was drawn, otherwise resets to 1. `streakOf` returns the live streak: it still counts today if yesterday was drawn, and shows 0 once a day is missed. Past · Present · Future is always available.
- **Privacy:** the question is never stored on-chain. The site hashes it with a random salt (`keccak256(salt ‖ question)`) so short questions can't be guessed from the hash; the question and salt stay in this browser. The question goes into a share link only if the seeker ticks "Include my question in the link".
- **AI reading:** the site sends the question, the spread and the drawn card ids with orientations to the Worker. The Worker looks up each card's meaning in its own copy of `cards.json` (so callers can't swap the meanings), asks Claude for structured JSON `{ cards: [{ position, reading }], story, reflection }`, and rejects anything incomplete so the site falls back to classic meanings. Readings are cached per reading id in the browser, so a reload shows the same words.
- **Sensitive questions** (health, death, pregnancy, legal, money decisions): the site shows a note that tarot is for reflection and suggests a professional; the Worker tells the model to keep to reflection and make no predictions.
- **Energy ring and Major vs Minor** are computed in the browser from the drawn cards: the ring shows the dominant element's share (Major Arcana count as Spirit).
- **Share:** `?reading=42` (plus `&net=testnet` on testnet) reloads the reading from the contract, no wallet needed; unknown ids show "This reading isn't in the deck". Share on X posts the cards and the link.
- **Reads:** `getReading(id)`, `readingsOf(seeker)`, `streakOf(seeker)`, `lastDailyDay(seeker)`, `total()` (the footer's live count). Event: `Drawn(id, seeker, spread, cards, reversed)`.

## Tests

```bash
npm --prefix tools install
node tools/make-cards.mjs      # regenerates cards.json and cards/*.svg
node tools/compile.mjs
node tools/test-contract.mjs   # every rule in the contract, on an in-memory chain (incl. streaks across days)
node tools/check-frontend.mjs  # the deck, and the ABI in index.html matches the contract; the site's calls work
npm --prefix worker install && npm --prefix worker test   # AI Worker, with the Anthropic API stubbed
```

## Credits

Card art is drawn for this project (`tools/make-cards.mjs`); the landing collage textures are generated in the browser. No third-party decks or photos.
