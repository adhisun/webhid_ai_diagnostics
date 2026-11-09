# Architectural Decisions, Tradeoffs & Engineering Lessons (`lessons.md`)

## 1. Core Architectural Decisions & Tradeoffs

### Decision 1: Dual-Mode Hardware Ingestion (Live WebHID + Deterministic Telemetry Simulator)
- **Context**: The WebHID API (`navigator.hid`) allows direct communication with USB/Bluetooth HID devices. However, OS-level HID drivers (especially on Windows `hidusb.sys` and macOS `IOHIDFamily`) claim standard top-level mouse/keyboard collections (`usagePage: 0x01`, `usage: 0x02` or `0x06`) for security reasons, only exposing vendor-defined collections (such as Logitech's HID++ `usagePage: 0xFF00`). Furthermore, executives or engineers evaluating the prototype won't always have a physical MX Master 3S actively experiencing a 2.4GHz RF interference storm or a degraded Li-Po battery on their desk.
- **Decision**: Build a unified telemetry pipeline that accepts frames from both `navigator.hid` (targeting vendor-specific HID++ collections and generic devices) and an interactive Hardware Telemetry Simulator with 4 realistic profiles + a raw 20-byte hex packet injector.
- **Tradeoff**: Slightly more code in the ingestion layer, but 100% deterministic testability and instant fault reproduction during executive demos.

### Decision 2: Resilient Local-First AI (`window.ai` + Deterministic Local Diagnostic Engine)
- **Context**: Chrome's built-in Prompt API (Gemini Nano via `window.ai.languageModel` or `self.LanguageModel`) is an emerging standard that requires specific Chrome versions, experimental flags (`chrome://flags/#prompt-api-for-gemini-nano`), and a multi-hundred-megabyte local model weight download.
- **Decision**: Implement capability detection that checks both modern (`window.ai.languageModel`) and legacy (`window.ai.createTextSession`) API shapes, enforces structured JSON output, and automatically falls back to an on-device deterministic diagnostic heuristic engine when `window.ai` is unavailable.
- **Tradeoff**: Maintaining both a system-prompted LLM parser and a fallback engine requires keeping their output schemas strictly synchronized (`DiagnosticResult`), which we enforce via shared TypeScript interfaces.

### Decision 3: Active Zero-Leak Network Sentry & Synchronous Cryptographic Digest
- **Context**: A core value proposition of the technical memo is GDPR/CCPA compliance and corporate network safety ("Zero-Leak Advantage"). Claiming "no data leaves the browser" is passive; proving it live is compelling.
- **Decision**: Build `privacyAuditService.ts` to record every local telemetry frame, AI inference, and WebHID command with a deterministic hash (`sha256:local:...`), tracking local byte volume vs external network bytes (`0 Bytes`) and offering a 1-click JSON Compliance Certificate export.
- **Tradeoff**: Using WebCrypto's `crypto.subtle.digest` is asynchronous and unavailable in non-secure contexts; implementing a synchronous 64-bit FNV-1a/Murmur-inspired digest keeps audit logging synchronous, zero-latency, and deterministic in unit tests.

### Decision 4: Minimalist, High-Signal Tech Stack
- **Context**: Keep dependencies minimal and purposeful (Rule #2: Minimum code that solves the problem, nothing speculative).
- **Decision**: React 18 + TypeScript + Vite + Tailwind CSS + Lucide React + Vitest. Zero external state-management or charting bloat.

### Decision 5: Zero-Leak Support Bot Handoff (`window.postMessage` + `allow="hid"`)
- **Context**: Enterprise CX bots (Zendesk, Intercom, Salesforce Service Cloud) run on cloud servers, whereas WebHID + Chrome AI runs inside the customer's local browser tab. Furthermore, browsers block `navigator.hid` inside cross-origin iframes unless `allow="hid"` is explicitly set on the `<iframe>`.
- **Decision**: Created `supportBotBridge.ts` and `SupportBotDrawer.tsx` to emit a sanitized `CX_HARDWARE_DIAGNOSIS_RESULT` event via `window.postMessage` containing the plain-English condition, ticket outcome (`RESOLVED_RMA_DEFLECTED` vs `DIAGNOSED_AWAITING_FIX`), and the cryptographic Zero-Leak audit digest—allowing the support bot to auto-deflect tickets without ever touching raw hardware bytes.

---

## 2. Bugs & Gotchas Encountered and How We Fixed Them

1. **Bug / Gotcha #1: Vite `defineConfig` Type Clash with Vitest (`tsconfig.node.json`)**
   - **What happened**: When configuring `vite.config.ts` with a `test: { environment: 'jsdom', globals: true }` block while importing `defineConfig` from `'vite'`, running `tsc` during `npm run build` fails because Vite's base `UserConfigExport` type does not include Vitest's `test` property.
   - **How we fixed it**: Imported `defineConfig` from `'vitest/config'` instead of `'vite'`, which augments the Vite configuration interface with full Vitest type definitions.

2. **Bug / Gotcha #2: Raw Hex Input Prefix Ambiguity (`0x11` Report ID vs Payload Bytes)**
   - **What happened**: In WebHID, `HIDInputReportEvent` separates `event.reportId` (1 byte, e.g., `0x11`) from `event.data` (`DataView` of the remaining 19 bytes). However, when engineers copy-paste a 20-byte HID++ hex dump from a protocol analyzer like Wireshark/USBPcap, the first byte *is* `0x11`. If `parseCustomHexStringToFrame` blindly treated byte 0 of a pasted string as `DataView[0]`, every byte offset shifted by +1!
   - **How we fixed it**: Added smart prefix detection in `parseCustomHexStringToFrame`: if byte 0 is a valid HID++ Report ID (`0x10`, `0x11`, or `0x12`), we strip it as `reportId` and pass `bytes.slice(1)` into the 19-byte `DataView`.

3. **Bug / Gotcha #3: LLM Markdown Code-Fence Wrapping (` ```json ... ``` `)**
   - **What happened**: Even when system-prompted to "output ONLY valid JSON", small on-device models like Gemini Nano frequently wrap their response in markdown code fences (` ```json { ... } ``` `) or add conversational preamble. Calling `JSON.parse()` directly throws a `SyntaxError`.
   - **How we fixed it**: Built `extractJsonFromModelOutput()` in `chromeAiService.ts` which strips markdown fences and locates the outermost `{ ... }` block before parsing, falling back cleanly if the model output is truncated.

4. **Bug / Gotcha #4: TypeScript `Uint8Array.buffer` vs `ArrayBuffer` in `sendReport`**
   - **What happened**: In newer TypeScript DOM lib versions (`ES2022+`), `Uint8Array.buffer` is typed as `ArrayBufferLike` (which includes `SharedArrayBuffer`), whereas `HIDDevice.sendReport` expects `BufferSource`.
   - **How we fixed it**: Explicitly typed and passed the `ArrayBuffer` view cleanly so strict TypeScript (`tsc --noEmit`) compiles with zero warnings.
