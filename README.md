# WebMCP on Demand — Proof of Concept

A demonstration of **WebMCP on Demand**: a Fastly Compute service that automatically makes any website AI-agent-ready by injecting [WebMCP declarative attributes](https://developer.chrome.com/blog/webmcp-epp) into HTML forms at the edge.

**The demo story:** a site owner puts their plain website behind Fastly, toggles on "WebMCP on Demand," and their site instantly becomes agent-ready. Zero code changes on the origin.

---

## Architecture

<img width="3120" height="1198" alt="CleanShot 2026-03-19 at 16 50 03" src="https://github.com/user-attachments/assets/87dfc64f-8c6b-4ecd-8699-c57d1aa5cc9d" />


## Project Structure

```
webmcp-on-demand-proto/
├── origin/                    # Demo travel website (the origin)
│   ├── server.js              # Express server — 5 pages, standard HTML forms
│   ├── public/styles.css      # Design system
│   └── package.json
├── edge/                      # Fastly Compute service
│   ├── src/
│   │   ├── index.js           # Main entry — HTMLRewritingStream pipeline
│   │   ├── classifier.js      # Form classification heuristics
│   │   ├── descriptions.js    # Tool/param description generators
│   │   └── badge.js           # Visual indicator HTML/CSS
│   ├── fastly.toml            # Fastly service config
│   └── package.json
└── README.md
```

## Quick Start

### 1. Start the origin server

```bash
cd origin
npm install
npm start
```

The SkyRoute travel site is now running at **http://localhost:3000**. Open it and verify you see a flight search page with no WebMCP attributes (check the `<form>` elements in DevTools — no `toolname` attribute).

### 2. Start the Fastly Compute local dev server

```bash
cd edge
npm install
fastly compute serve
```

The edge worker is now proxying to the origin. Open the Fastly local URL (typically **http://127.0.0.1:7676**).

### 3. See WebMCP in action

1. Open DevTools → Elements tab
2. Inspect any `<form>` element — you'll see injected `toolname`, `tooldescription`, and `toolparamdescription` attributes
3. Notice the floating badge in the bottom-right corner showing detected tools
4. Hover over the badge to see a list of all detected tools

### 4. Test with Chrome's WebMCP support

If using **Chrome 146+** with the WebMCP flag enabled:

1. Open `chrome://flags` and enable "Web Model Context Protocol"
2. Navigate to the Fastly local URL
3. Open the Chrome Model Context Tool Inspector (DevTools → More Tools → Model Context)
4. You should see the injected tools listed and usable by AI agents

## What Gets Injected

The edge worker detects and classifies these forms:

| Page | Form | Tool Name | Auto-Submit |
|------|------|-----------|-------------|
| Homepage | Flight search | `search` | Yes |
| Results | Filter/sort | `filter_search` | Yes |
| Booking | Passenger details | `book_confirm` | No |
| Support | Support request | `contact_support_submit` | No |

Each form field gets a `toolparamdescription` with:
- Human-readable label
- Type hints (email, date, phone, etc.)
- Constraints (required, min/max, pattern)
- Example values from placeholders
- Available options for `<select>` elements

## Heuristic Engine

The form classifier uses two layers:

**Layer 1 — Form-level classification** examines:
- `action` attribute (`/search`, `/book`, `/contact`, etc.)
- `method` attribute (GET → search/filter, POST → submission)
- `id`, `class`, `role`, `aria-label` attributes
- Known patterns (search, login, booking, contact, newsletter)

**Layer 2 — Parameter-level descriptions** examines:
- `<label>` text (via name/id inference in streaming mode)
- `placeholder` and `aria-label` attributes
- Input `type` (date, email, tel, number carry semantic meaning)
- `pattern`, `min`, `max`, `required` constraints
- `<select>` options

## Technical Notes

- The edge worker uses `HTMLRewritingStream` for **streaming HTML modification** — it never buffers the full response, keeping Time to First Byte low
- The visual badge uses a client-side `<script>` to count `[toolname]` elements because the streaming model can't know the final count at injection time
- Form classification happens eagerly when the `<form>` element is encountered (before child elements stream through), using form-level signals
- Non-HTML responses (CSS, JS, images) pass through untouched
- `Content-Length` headers are removed since the body size changes after injection
