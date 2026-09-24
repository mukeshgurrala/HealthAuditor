# HealthAuditor rule catalog

> Generated from the rule registry by `npm run docs:rules`. Do not edit by hand.
> Ruleset version **0.2.0** — 60 rules.

| Rule | Name | Category | Severity | Effort | Weight |
| --- | --- | --- | --- | --- | --- |
| `PERF-IMG-001` | Oversized images | Performance | high | easy | 6 |
| `PERF-IMG-002` | Modern image formats | Performance | medium | easy | 3 |
| `PERF-IMG-003` | Images declare dimensions | Performance | medium | easy | 3 |
| `PERF-IMG-004` | Offscreen images are lazy-loaded | Performance | low | easy | 1 |
| `PERF-001` | Render-blocking scripts | Performance | high | medium | 6 |
| `PERF-002` | JavaScript payload size | Performance | high | hard | 6 |
| `PERF-003` | CSS payload size | Performance | medium | medium | 3 |
| `PERF-004` | Total page weight | Performance | medium | medium | 3 |
| `PERF-005` | Server response time | Performance | high | hard | 6 |
| `PERF-006` | Request count | Performance | low | medium | 1 |
| `PERF-007` | Web font loading | Performance | low | easy | 1 |
| `PERF-CWV-001` | Largest Contentful Paint (LCP) | Performance | critical | hard | 10 |
| `PERF-CWV-002` | Cumulative Layout Shift (CLS) | Performance | high | medium | 6 |
| `PERF-CWV-003` | Interaction responsiveness (INP/TBT) | Performance | high | hard | 6 |
| `SEO-001` | Page title | SEO | high | easy | 6 |
| `SEO-002` | Meta description | SEO | medium | easy | 3 |
| `SEO-003` | Canonical URL | SEO | medium | easy | 3 |
| `SEO-004` | Viewport meta tag | SEO | high | easy | 6 |
| `SEO-005` | Single descriptive H1 | SEO | medium | easy | 3 |
| `SEO-006` | Indexability (robots directives) | SEO | critical | easy | 10 |
| `SEO-007` | robots.txt | SEO | medium | easy | 3 |
| `SEO-008` | XML sitemap | SEO | medium | easy | 3 |
| `SEO-009` | Open Graph metadata | SEO | low | easy | 1 |
| `SEO-010` | Twitter/X card metadata | SEO | low | easy | 1 |
| `SEO-011` | Structured data (JSON-LD) | SEO | low | medium | 1 |
| `SEO-012` | Redirect chain | SEO | medium | medium | 3 |
| `SEO-013` | hreflang annotations | SEO | low | medium | 1 |
| `SEO-014` | Crawlable text content | SEO | high | hard | 6 |
| `SEO-015` | Favicon | SEO | low | easy | 1 |
| `A11Y-001` | Images have alt text | Accessibility | high | easy | 6 |
| `A11Y-002` | Page language declared | Accessibility | high | easy | 6 |
| `A11Y-003` | Form inputs have labels | Accessibility | critical | medium | 10 |
| `A11Y-004` | Links have discernible text | Accessibility | high | easy | 6 |
| `A11Y-005` | Buttons have accessible names | Accessibility | high | easy | 6 |
| `A11Y-006` | Heading hierarchy | Accessibility | medium | easy | 3 |
| `A11Y-007` | Zoom is not disabled | Accessibility | medium | easy | 3 |
| `A11Y-008` | ARIA usage | Accessibility | medium | medium | 3 |
| `A11Y-009` | Frames have titles | Accessibility | medium | easy | 3 |
| `A11Y-010` | Keyboard focus order | Accessibility | medium | medium | 3 |
| `A11Y-011` | Inline text contrast | Accessibility | high | medium | 6 |
| `BP-001` | HTML5 doctype | Best Practices | medium | easy | 3 |
| `BP-002` | Character encoding declared | Best Practices | medium | easy | 3 |
| `BP-003` | Text compression | Best Practices | medium | easy | 3 |
| `BP-004` | Static asset caching | Best Practices | medium | medium | 3 |
| `BP-005` | Deprecated HTML elements | Best Practices | low | easy | 1 |
| `BP-006` | document.write() | Best Practices | medium | medium | 3 |
| `BP-007` | Broken internal links | Best Practices | high | easy | 6 |
| `BP-008` | Link redirects | Best Practices | low | easy | 1 |
| `SEC-001` | HTTPS | Security | critical | easy | 10 |
| `SEC-002` | HTTP Strict Transport Security | Security | medium | easy | 3 |
| `SEC-003` | Content-Security-Policy | Security | high | hard | 6 |
| `SEC-004` | X-Content-Type-Options | Security | low | easy | 1 |
| `SEC-005` | Referrer-Policy | Security | low | easy | 1 |
| `SEC-006` | Permissions-Policy | Security | low | easy | 1 |
| `SEC-007` | Mixed content | Security | high | easy | 6 |
| `SEC-008` | Clickjacking protection | Security | medium | easy | 3 |
| `SEC-009` | Software version disclosure | Security | low | easy | 1 |
| `SEC-010` | Cookie flags | Security | medium | easy | 3 |
| `SEC-011` | Form submission security | Security | high | easy | 6 |
| `SEC-012` | Cross-origin link safety | Security | low | easy | 1 |

Severity weights used in category scoring: critical = 10, high = 6, medium = 3, low = 1.

## Performance

_How quickly the page loads and becomes usable._

### PERF-IMG-001 — Oversized images

- **Category:** Performance
- **Severity:** high
- **Effort:** easy
- **Scoring weight:** 6

**Why it matters**  
Images are usually the heaviest thing on a page. Anything above ~500 KB delays the largest contentful paint, especially on mobile data.

**Detection**  
Measures every discovered image with a HEAD (or ranged GET) request and flags files larger than 500 KB.

**Fix**  
Compress the image, serve it at the size it is actually displayed, and use WebP or AVIF.

### PERF-IMG-002 — Modern image formats

- **Category:** Performance
- **Severity:** medium
- **Effort:** easy
- **Scoring weight:** 3

**Why it matters**  
WebP and AVIF typically produce 25–50% smaller files than JPEG and PNG at the same visual quality.

**Detection**  
Flags measured PNG/JPEG/GIF images larger than 100 KB.

**Fix**  
Serve WebP or AVIF with a <picture> element that falls back to the original format.

### PERF-IMG-003 — Images declare dimensions

- **Category:** Performance
- **Severity:** medium
- **Effort:** easy
- **Scoring weight:** 3

**Why it matters**  
Without width and height (or a CSS aspect-ratio) the browser does not know how much space to reserve, so content jumps as images load. That is measured as Cumulative Layout Shift.

**Detection**  
Checks each <img> for width and height attributes.

**Fix**  
Add width and height attributes matching the image's aspect ratio.

### PERF-IMG-004 — Offscreen images are lazy-loaded

- **Category:** Performance
- **Severity:** low
- **Effort:** easy
- **Scoring weight:** 1

**Why it matters**  
Images far below the fold do not need to be downloaded during the initial load. loading="lazy" defers them until the user scrolls near them.

**Detection**  
When a page has more than six images, checks whether any of the later ones use loading="lazy".

**Fix**  
Add loading="lazy" to images below the fold (never to the hero/LCP image).

### PERF-001 — Render-blocking scripts

- **Category:** Performance
- **Severity:** high
- **Effort:** medium
- **Scoring weight:** 6

**Why it matters**  
A <script src> in the <head> without async or defer stops HTML parsing until the file is downloaded and executed, delaying first paint.

**Detection**  
Counts script elements inside <head> that have a src but neither async, defer nor type="module".

**Fix**  
Add defer (or move the script to the end of <body>) unless it must run before the page renders.

### PERF-002 — JavaScript payload size

- **Category:** Performance
- **Severity:** high
- **Effort:** hard
- **Scoring weight:** 6

**Why it matters**  
JavaScript is the most expensive resource type: it has to be downloaded, parsed and executed on the main thread before the page becomes interactive.

**Detection**  
Sums the transfer size of every external script referenced by the HTML.

**Fix**  
Code-split, drop unused dependencies, and load non-critical scripts after interaction.

### PERF-003 — CSS payload size

- **Category:** Performance
- **Severity:** medium
- **Effort:** medium
- **Scoring weight:** 3

**Why it matters**  
Stylesheets block rendering: the browser will not paint until every stylesheet in the head has loaded.

**Detection**  
Sums the transfer size of every external stylesheet referenced by the HTML.

**Fix**  
Remove unused CSS, split per-route styles, and inline only what is needed above the fold.

### PERF-004 — Total page weight

- **Category:** Performance
- **Severity:** medium
- **Effort:** medium
- **Scoring weight:** 3

**Why it matters**  
Page weight is the sum of everything the browser must download. Heavy pages are slow and expensive on mobile data plans.

**Detection**  
Adds the HTML document size to every measured image, script, stylesheet and font.

**Fix**  
Reduce the biggest contributors first — usually images, then JavaScript.

### PERF-005 — Server response time

- **Category:** Performance
- **Severity:** high
- **Effort:** hard
- **Scoring weight:** 6

**Why it matters**  
Time to first byte is how long the server takes to start replying. Everything else — rendering, images, scripts — waits behind it.

**Detection**  
Measures the time between opening the connection and receiving the first byte of the HTML document from this audit server.

**Fix**  
Cache HTML at the edge, speed up server-side rendering, or put a CDN in front of the origin.

### PERF-006 — Request count

- **Category:** Performance
- **Severity:** low
- **Effort:** medium
- **Scoring weight:** 1

**Why it matters**  
Every request costs a round trip. Bundling and sprite-free icon systems keep the count sane.

**Detection**  
Counts images, scripts, stylesheets, fonts and embedded media referenced by the initial HTML.

**Fix**  
Bundle scripts and styles, inline small icons, and lazy-load what is not needed immediately.

### PERF-007 — Web font loading

- **Category:** Performance
- **Severity:** low
- **Effort:** easy
- **Scoring weight:** 1

**Why it matters**  
Web fonts fetched from a third-party domain need a fresh DNS lookup and TLS handshake; without font-display the text stays invisible while they load.

**Detection**  
Detects third-party font stylesheets and checks for a matching preconnect hint and font-display usage.

**Fix**  
Add <link rel="preconnect"> for the font host and use font-display: swap (or self-host the font).

### PERF-CWV-001 — Largest Contentful Paint (LCP)

- **Category:** Performance
- **Severity:** critical
- **Effort:** hard
- **Scoring weight:** 10

**Why it matters**  
LCP is how long it takes for the biggest piece of content — usually the hero image or headline — to appear. Google considers 2.5 s or less 'good'.

**Detection**  
Read from a Lighthouse run via the PageSpeed Insights API (mobile emulation) when an API key is configured.

**Fix**  
Optimise the hero image, remove render-blocking resources and speed up server response.

**References**  
- https://web.dev/articles/lcp

### PERF-CWV-002 — Cumulative Layout Shift (CLS)

- **Category:** Performance
- **Severity:** high
- **Effort:** medium
- **Scoring weight:** 6

**Why it matters**  
CLS measures how much the layout jumps while loading. Anything above 0.1 means users are likely to mis-tap or lose their place.

**Detection**  
Read from a Lighthouse run via the PageSpeed Insights API when an API key is configured.

**Fix**  
Reserve space for images, ads and embeds, and avoid injecting content above existing content.

**References**  
- https://web.dev/articles/cls

### PERF-CWV-003 — Interaction responsiveness (INP/TBT)

- **Category:** Performance
- **Severity:** high
- **Effort:** hard
- **Scoring weight:** 6

**Why it matters**  
INP measures how quickly the page responds to taps and clicks. In a lab run it is approximated by Total Blocking Time — the time the main thread was too busy to respond.

**Detection**  
Uses field INP when available from PageSpeed Insights, otherwise lab Total Blocking Time.

**Fix**  
Break up long tasks, defer non-critical JavaScript and reduce third-party scripts.

**References**  
- https://web.dev/articles/inp

## SEO

_How discoverable the page is for search engines._

### SEO-001 — Page title

- **Category:** SEO
- **Severity:** high
- **Effort:** easy
- **Scoring weight:** 6

**Why it matters**  
The title is the clickable headline in search results and the label of the browser tab. Search engines weigh it heavily when matching a page to a query.

**Detection**  
Reads the first <title> element and checks that it exists and is between 10 and 65 characters.

**Fix**  
Write a unique, descriptive title of roughly 50–60 characters that contains the page's main topic and your brand.

**References**  
- https://developers.google.com/search/docs/appearance/title-link

### SEO-002 — Meta description

- **Category:** SEO
- **Severity:** medium
- **Effort:** easy
- **Scoring weight:** 3

**Why it matters**  
The meta description is the snippet search engines usually show under your title. A good one improves click-through rate even though it is not a direct ranking factor.

**Detection**  
Looks for <meta name="description"> and checks the content is between 50 and 165 characters.

**Fix**  
Add a 120–160 character description that summarises the page and invites the click.

**References**  
- https://developers.google.com/search/docs/appearance/snippet

### SEO-003 — Canonical URL

- **Category:** SEO
- **Severity:** medium
- **Effort:** easy
- **Scoring weight:** 3

**Why it matters**  
A canonical link tells search engines which URL is the master copy of a page, preventing duplicate-content dilution across parameter and protocol variants.

**Detection**  
Checks for a single, absolute <link rel="canonical"> and compares its origin with the audited page.

**Fix**  
Add exactly one absolute canonical link pointing at the preferred version of this page.

**References**  
- https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls

### SEO-004 — Viewport meta tag

- **Category:** SEO
- **Severity:** high
- **Effort:** easy
- **Scoring weight:** 6

**Why it matters**  
Without a viewport meta tag mobile browsers render the page at desktop width and zoom out, which hurts both mobile usability and mobile search performance.

**Detection**  
Checks for <meta name="viewport"> containing a width directive.

**Fix**  
Add <meta name="viewport" content="width=device-width, initial-scale=1"> to the <head>.

**References**  
- https://developer.mozilla.org/docs/Web/HTML/Viewport_meta_tag

### SEO-005 — Single descriptive H1

- **Category:** SEO
- **Severity:** medium
- **Effort:** easy
- **Scoring weight:** 3

**Why it matters**  
The H1 is the main on-page heading. Search engines and screen readers use it to understand what the page is about.

**Detection**  
Counts <h1> elements with non-empty text content.

**Fix**  
Use exactly one H1 that describes the page content.

### SEO-006 — Indexability (robots directives)

- **Category:** SEO
- **Severity:** critical
- **Effort:** easy
- **Scoring weight:** 10

**Why it matters**  
A noindex directive removes the page from search results entirely. It is usually left behind by accident after a staging deploy.

**Detection**  
Reads <meta name="robots"> and the X-Robots-Tag response header for noindex/nofollow directives.

**Fix**  
Remove the noindex directive if this page should appear in search results.

### SEO-007 — robots.txt

- **Category:** SEO
- **Severity:** medium
- **Effort:** easy
- **Scoring weight:** 3

**Why it matters**  
robots.txt tells crawlers which parts of the site they may request and where the sitemap lives. A missing file is not fatal, but a blocking one is.

**Detection**  
Requests /robots.txt and inspects the wildcard user-agent group.

**Fix**  
Publish a robots.txt at the domain root and reference your sitemap from it.

### SEO-008 — XML sitemap

- **Category:** SEO
- **Severity:** medium
- **Effort:** easy
- **Scoring weight:** 3

**Why it matters**  
A sitemap helps search engines discover every page you care about, especially pages that are not well linked internally.

**Detection**  
Follows sitemap entries in robots.txt, then tries /sitemap.xml and /sitemap_index.xml.

**Fix**  
Publish an XML sitemap and reference it from robots.txt.

### SEO-009 — Open Graph metadata

- **Category:** SEO
- **Severity:** low
- **Effort:** easy
- **Scoring weight:** 1

**Why it matters**  
Open Graph tags control the title, description and image shown when the page is shared on social platforms and messaging apps.

**Detection**  
Checks for og:title, og:description and og:image.

**Fix**  
Add og:title, og:description, og:image and og:url to the <head>.

**References**  
- https://ogp.me/

### SEO-010 — Twitter/X card metadata

- **Category:** SEO
- **Severity:** low
- **Effort:** easy
- **Scoring weight:** 1

**Why it matters**  
Twitter/X card tags control how links to the page render on X and in several other apps that reuse the format.

**Detection**  
Checks for <meta name="twitter:card">.

**Fix**  
Add <meta name="twitter:card" content="summary_large_image"> plus twitter:title and twitter:description.

### SEO-011 — Structured data (JSON-LD)

- **Category:** SEO
- **Severity:** low
- **Effort:** medium
- **Scoring weight:** 1

**Why it matters**  
Structured data lets search engines understand entities on the page and can unlock rich results such as breadcrumbs, FAQs and product cards.

**Detection**  
Parses every <script type="application/ld+json"> block, validates JSON syntax and checks for @context/@type.

**Fix**  
Add valid schema.org JSON-LD that describes what this page represents.

**References**  
- https://schema.org/
- https://developers.google.com/search/docs/appearance/structured-data

### SEO-012 — Redirect chain

- **Category:** SEO
- **Severity:** medium
- **Effort:** medium
- **Scoring weight:** 3

**Why it matters**  
Each redirect adds a round trip before anything renders and dilutes crawl budget. Chains of two or more are worth collapsing.

**Detection**  
Follows redirects manually and records every hop between the requested URL and the final page.

**Fix**  
Point the first URL directly at the final destination so only one hop (or none) remains.

### SEO-013 — hreflang annotations

- **Category:** SEO
- **Severity:** low
- **Effort:** medium
- **Scoring weight:** 1

**Why it matters**  
When a site serves multiple languages, hreflang tells search engines which version to show. Broken annotations can send users to the wrong language.

**Detection**  
Validates language codes in <link rel="alternate" hreflang> and checks for a self-referencing entry.

**Fix**  
Use valid BCP-47 codes and include a self-referencing hreflang for this page.

### SEO-014 — Crawlable text content

- **Category:** SEO
- **Severity:** high
- **Effort:** hard
- **Scoring weight:** 6

**Why it matters**  
If the HTML response contains almost no text, search engines that do not execute JavaScript see an empty page. Client-side-only rendering is the usual cause.

**Detection**  
Strips script/style/noscript nodes from the server HTML and counts the remaining words.

**Fix**  
Server-render or pre-render the main content so it exists in the initial HTML response.

### SEO-015 — Favicon

- **Category:** SEO
- **Severity:** low
- **Effort:** easy
- **Scoring weight:** 1

**Why it matters**  
A favicon is shown in browser tabs, bookmarks and some search result layouts. Its absence looks unfinished.

**Detection**  
Looks for <link rel="icon"> variants in the HTML, then probes /favicon.ico via the collected resources.

**Fix**  
Add <link rel="icon" href="/favicon.ico"> (plus an SVG or 180×180 PNG for modern devices).

## Accessibility

_Whether the page can be used by everyone, including assistive technology._

### A11Y-001 — Images have alt text

- **Category:** Accessibility
- **Severity:** high
- **Effort:** easy
- **Scoring weight:** 6

**Why it matters**  
Screen readers announce the alt attribute instead of the image. Without it, users hear a file name or nothing at all.

**Detection**  
Checks every <img> for an alt attribute. Decorative images are expected to use alt="" explicitly.

**Fix**  
Describe what the image conveys in its alt attribute, or use alt="" if it is purely decorative.

**References**  
- https://www.w3.org/WAI/tutorials/images/

### A11Y-002 — Page language declared

- **Category:** Accessibility
- **Severity:** high
- **Effort:** easy
- **Scoring weight:** 6

**Why it matters**  
The lang attribute tells screen readers which pronunciation rules to use and helps browsers offer translation.

**Detection**  
Checks <html lang> exists and looks like a valid BCP-47 language code.

**Fix**  
Set the document language, e.g. <html lang="en">.

### A11Y-003 — Form inputs have labels

- **Category:** Accessibility
- **Severity:** critical
- **Effort:** medium
- **Scoring weight:** 10

**Why it matters**  
An input without a label is announced as just "edit text". Users of screen readers cannot tell what to type.

**Detection**  
For each input/select/textarea (excluding hidden, submit and button types) looks for a wrapping <label>, a label[for], aria-label, aria-labelledby or title.

**Fix**  
Associate a visible <label for="…"> with every field, or provide aria-label when a visible label is impossible.

### A11Y-004 — Links have discernible text

- **Category:** Accessibility
- **Severity:** high
- **Effort:** easy
- **Scoring weight:** 6

**Why it matters**  
A link with no text (often an icon-only link) is announced as "link" with no destination, and gives search engines no anchor context.

**Detection**  
Checks each <a href> for text content, an image with alt text, aria-label, aria-labelledby or title.

**Fix**  
Add visible link text, or aria-label describing where the link goes.

### A11Y-005 — Buttons have accessible names

- **Category:** Accessibility
- **Severity:** high
- **Effort:** easy
- **Scoring weight:** 6

**Why it matters**  
A button with no name is announced only as "button", so nobody using a screen reader knows what it does.

**Detection**  
Checks <button> and role="button" elements for text, aria-label, aria-labelledby, title or a labelled image.

**Fix**  
Give every button visible text or an aria-label.

### A11Y-006 — Heading hierarchy

- **Category:** Accessibility
- **Severity:** medium
- **Effort:** easy
- **Scoring weight:** 3

**Why it matters**  
Screen-reader users navigate by heading level. Skipping levels (h2 → h4) makes the document outline confusing.

**Detection**  
Reads headings in document order and reports any jump of more than one level.

**Fix**  
Use heading levels in order; style them with CSS rather than picking a level for its size.

### A11Y-007 — Zoom is not disabled

- **Category:** Accessibility
- **Severity:** medium
- **Effort:** easy
- **Scoring weight:** 3

**Why it matters**  
Blocking zoom with user-scalable=no or a small maximum-scale prevents low-vision users from reading the page.

**Detection**  
Parses the viewport meta tag for user-scalable=no and maximum-scale below 2.

**Fix**  
Remove user-scalable=no and any maximum-scale below 2 from the viewport tag.

### A11Y-008 — ARIA usage

- **Category:** Accessibility
- **Severity:** medium
- **Effort:** medium
- **Scoring weight:** 3

**Why it matters**  
Invalid ARIA roles are ignored, and aria-hidden on a focusable element creates a control that keyboard users can reach but screen readers cannot describe.

**Detection**  
Validates every role attribute against the ARIA role list and looks for focusable elements inside aria-hidden="true".

**Fix**  
Use a valid role (or native HTML instead), and never put aria-hidden on interactive elements.

**References**  
- https://www.w3.org/TR/wai-aria-1.2/#role_definitions

### A11Y-009 — Frames have titles

- **Category:** Accessibility
- **Severity:** medium
- **Effort:** easy
- **Scoring weight:** 3

**Why it matters**  
Screen readers announce iframes by their title. Untitled frames are announced as just "frame".

**Detection**  
Checks every <iframe> for a non-empty title attribute.

**Fix**  
Add a descriptive title, e.g. <iframe title="Location map">.

### A11Y-010 — Keyboard focus order

- **Category:** Accessibility
- **Severity:** medium
- **Effort:** medium
- **Scoring weight:** 3

**Why it matters**  
A positive tabindex forces an element ahead of everything else in the tab order, which almost always produces a confusing keyboard experience.

**Detection**  
Finds elements with tabindex greater than 0.

**Fix**  
Use tabindex="0" (or no tabindex) and rely on DOM order for focus sequence.

### A11Y-011 — Inline text contrast

- **Category:** Accessibility
- **Severity:** high
- **Effort:** medium
- **Scoring weight:** 6

**Why it matters**  
Text needs a contrast ratio of at least 4.5:1 against its background (3:1 for large text) to stay readable for low-vision users and in bright sunlight.

**Detection**  
Computes the WCAG contrast ratio for elements that declare both color and background-color in an inline style. Contrast set through CSS files cannot be measured without rendering the page.

**Fix**  
Darken the text or lighten the background until the ratio is at least 4.5:1.

**References**  
- https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html

## Best Practices

_Modern web implementation practices and correctness._

### BP-001 — HTML5 doctype

- **Category:** Best Practices
- **Severity:** medium
- **Effort:** easy
- **Scoring weight:** 3

**Why it matters**  
Without <!DOCTYPE html> browsers fall back to quirks mode, where layout and CSS behave differently from every modern expectation.

**Detection**  
Checks that the response starts with an HTML5 doctype declaration.

**Fix**  
Make <!DOCTYPE html> the very first line of the document.

### BP-002 — Character encoding declared

- **Category:** Best Practices
- **Severity:** medium
- **Effort:** easy
- **Scoring weight:** 3

**Why it matters**  
If the encoding is not declared early, browsers may guess wrong and display mojibake instead of accented characters and symbols.

**Detection**  
Looks for <meta charset> (or a charset in the Content-Type header) within the first 1024 bytes.

**Fix**  
Put <meta charset="utf-8"> as the first element inside <head>.

### BP-003 — Text compression

- **Category:** Best Practices
- **Severity:** medium
- **Effort:** easy
- **Scoring weight:** 3

**Why it matters**  
Gzip or Brotli typically shrink HTML, CSS and JavaScript by 70–80%. Serving them uncompressed wastes bandwidth on every visit.

**Detection**  
Checks the Content-Encoding response header of the HTML document.

**Fix**  
Enable Brotli (or gzip) compression for text responses on your server or CDN.

### BP-004 — Static asset caching

- **Category:** Best Practices
- **Severity:** medium
- **Effort:** medium
- **Scoring weight:** 3

**Why it matters**  
Static files that never change should be cached by the browser for a long time, so repeat visits download almost nothing.

**Detection**  
Reads Cache-Control on measured images, scripts, stylesheets and fonts, flagging max-age under one day.

**Fix**  
Serve hashed filenames with Cache-Control: public, max-age=31536000, immutable.

### BP-005 — Deprecated HTML elements

- **Category:** Best Practices
- **Severity:** low
- **Effort:** easy
- **Scoring weight:** 1

**Why it matters**  
Elements like <center>, <font> and <marquee> were removed from the standard. Browsers still tolerate them, but their behaviour is not guaranteed.

**Detection**  
Searches the DOM for center, font, marquee, blink, big, strike, frameset, applet.

**Fix**  
Replace deprecated presentational elements with CSS.

### BP-006 — document.write()

- **Category:** Best Practices
- **Severity:** medium
- **Effort:** medium
- **Scoring weight:** 3

**Why it matters**  
document.write() blocks parsing and can be ignored entirely by browsers on slow connections, which silently breaks whatever it injected.

**Detection**  
Searches inline scripts for document.write( calls.

**Fix**  
Insert nodes with DOM APIs, or load third-party scripts asynchronously.

### BP-007 — Broken internal links

- **Category:** Best Practices
- **Severity:** high
- **Effort:** easy
- **Scoring weight:** 6

**Why it matters**  
Links that return 4xx or 5xx waste the visit and, for internal links, waste crawl budget too. They are also the easiest problem on this list to fix.

**Detection**  
Requests each discovered link (HEAD, falling back to GET) and reports 4xx/5xx responses. External hosts that block bots are reported as unverified, never as broken.

**Fix**  
Update or remove the broken links, or add redirects for URLs that moved.

### BP-008 — Link redirects

- **Category:** Best Practices
- **Severity:** low
- **Effort:** easy
- **Scoring weight:** 1

**Why it matters**  
Internal links that point at a redirect add an extra round trip for every visitor who clicks them.

**Detection**  
Reports internal links whose first response is a 3xx redirect.

**Fix**  
Update the href to the final destination URL.

## Security

_Observable security configuration of the response and its resources._

### SEC-001 — HTTPS

- **Category:** Security
- **Severity:** critical
- **Effort:** easy
- **Scoring weight:** 10

**Why it matters**  
Without HTTPS, everything between the visitor and the server can be read or modified in transit, and browsers mark the site as 'Not secure'.

**Detection**  
Checks the protocol of the final URL after redirects.

**Fix**  
Install a TLS certificate (Let's Encrypt is free) and redirect all HTTP traffic to HTTPS.

### SEC-002 — HTTP Strict Transport Security

- **Category:** Security
- **Severity:** medium
- **Effort:** easy
- **Scoring weight:** 3

**Why it matters**  
HSTS tells browsers to only ever contact this domain over HTTPS, closing the window where a first HTTP request can be intercepted.

**Detection**  
Looks for a Strict-Transport-Security response header with a max-age of at least six months.

**Fix**  
Send Strict-Transport-Security: max-age=31536000; includeSubDomains.

**References**  
- https://developer.mozilla.org/docs/Web/HTTP/Headers/Strict-Transport-Security

### SEC-003 — Content-Security-Policy

- **Category:** Security
- **Severity:** high
- **Effort:** hard
- **Scoring weight:** 6

**Why it matters**  
A Content-Security-Policy restricts where scripts, styles and frames may come from. It is the strongest available defence against cross-site scripting.

**Detection**  
Looks for a Content-Security-Policy response header or meta tag, and flags obviously unsafe directives.

**Fix**  
Start with a report-only policy, tighten it until nothing is reported, then enforce it.

**References**  
- https://developer.mozilla.org/docs/Web/HTTP/CSP

### SEC-004 — X-Content-Type-Options

- **Category:** Security
- **Severity:** low
- **Effort:** easy
- **Scoring weight:** 1

**Why it matters**  
Without nosniff, browsers may guess a response's type and execute a file that was never meant to be a script.

**Detection**  
Checks for X-Content-Type-Options: nosniff on the HTML response.

**Fix**  
Send X-Content-Type-Options: nosniff on all responses.

### SEC-005 — Referrer-Policy

- **Category:** Security
- **Severity:** low
- **Effort:** easy
- **Scoring weight:** 1

**Why it matters**  
Referrer-Policy controls how much of the current URL is sent to other sites. The default can leak private paths and query strings.

**Detection**  
Checks for a Referrer-Policy header or meta tag.

**Fix**  
Send Referrer-Policy: strict-origin-when-cross-origin.

### SEC-006 — Permissions-Policy

- **Category:** Security
- **Severity:** low
- **Effort:** easy
- **Scoring weight:** 1

**Why it matters**  
Permissions-Policy lets you switch off browser features (camera, microphone, geolocation) that your site — and any embedded third party — should never use.

**Detection**  
Checks for a Permissions-Policy (or legacy Feature-Policy) response header.

**Fix**  
Send Permissions-Policy disabling the features you do not need.

### SEC-007 — Mixed content

- **Category:** Security
- **Severity:** high
- **Effort:** easy
- **Scoring weight:** 6

**Why it matters**  
An HTTPS page that loads resources over HTTP breaks the security guarantee; browsers block or downgrade those requests.

**Detection**  
Scans every discovered image, script, stylesheet, font and iframe URL for the http:// protocol on an HTTPS page.

**Fix**  
Update the URLs to https:// (or protocol-relative paths served from your own domain).

### SEC-008 — Clickjacking protection

- **Category:** Security
- **Severity:** medium
- **Effort:** easy
- **Scoring weight:** 3

**Why it matters**  
Without frame restrictions, an attacker can embed your page in an invisible iframe and trick users into clicking things they cannot see.

**Detection**  
Checks for frame-ancestors in the CSP or an X-Frame-Options header.

**Fix**  
Add frame-ancestors 'self' to your CSP (X-Frame-Options: SAMEORIGIN is the legacy equivalent).

### SEC-009 — Software version disclosure

- **Category:** Security
- **Severity:** low
- **Effort:** easy
- **Scoring weight:** 1

**Why it matters**  
Version numbers in response headers tell an attacker exactly which known vulnerabilities to try. Hiding them is free.

**Detection**  
Looks for version numbers in the Server and X-Powered-By response headers.

**Fix**  
Strip version details from Server and remove X-Powered-By entirely.

### SEC-010 — Cookie flags

- **Category:** Security
- **Severity:** medium
- **Effort:** easy
- **Scoring weight:** 3

**Why it matters**  
Cookies without Secure can be sent over plain HTTP; without HttpOnly they can be read by any script that gets injected into the page.

**Detection**  
Inspects Set-Cookie headers on the HTML response for Secure, HttpOnly and SameSite.

**Fix**  
Set Secure, HttpOnly and SameSite=Lax (or Strict) on session cookies.

### SEC-011 — Form submission security

- **Category:** Security
- **Severity:** high
- **Effort:** easy
- **Scoring weight:** 6

**Why it matters**  
A form that posts to an http:// endpoint sends whatever the user typed — including passwords — in plain text.

**Detection**  
Checks every <form action> for the http:// protocol.

**Fix**  
Point the form action at an https:// endpoint.

### SEC-012 — Cross-origin link safety

- **Category:** Security
- **Severity:** low
- **Effort:** easy
- **Scoring weight:** 1

**Why it matters**  
A target="_blank" link gives the opened page a reference back to yours unless rel="noopener" is set. Older browsers allow that page to redirect yours.

**Detection**  
Finds external links with target="_blank" and no rel="noopener" or rel="noreferrer".

**Fix**  
Add rel="noopener noreferrer" to external links that open in a new tab.

