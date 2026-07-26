# opencursor sample workspace

Open this folder in the Extension Development Host to try opencursor end to end.

Suggested tries:

1. **Chat + context** — In the opencursor sidebar, ask:
   `What does @src/math.js do?` — the answer should reference `divide`.

2. **Inline edit (Cmd/Ctrl+K)** — Open `src/math.js`, select `divide`, press
   Cmd/Ctrl+K, and type: `throw a RangeError on divide by zero`. Review the diff
   and accept the hunk.

3. **Agent mode** — Switch the composer to **Agent**, then send:
   `Add a multiply function to src/math.js and a passing test in
   src/math.test.js, then run npm test.` Approve the file writes and the
   terminal command when prompted, and watch the step trace.

4. **@codebase** — Run **opencursor: Index Workspace**, then ask:
   `Where are the arithmetic helpers? @codebase`
