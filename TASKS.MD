# TASKS.MD - WebHID + Chrome AI On-Device Diagnostics Prototype

## Phase 1: Project Scaffolding & Configuration
- [x] Create `package.json` with React 18, TypeScript, Vite, Tailwind CSS, Lucide React, and Vitest
- [x] Create `tsconfig.json`, `tsconfig.node.json`, and `vite.config.ts`
- [x] Create `tailwind.config.js`, `postcss.config.js`, `index.html`, and `src/index.css`
- [x] Install dependencies and verify project configuration

## Phase 2: Domain Types & Protocol Definitions
- [x] Create `src/types/webhid.ts` (WebHID browser declarations, Logitech HID++ 2.0 feature constants, report structures)
- [x] Create `src/types/diagnostics.ts` (Telemetry frames, metrics, AI technician output schema, resolution definitions)
- [x] Create `src/types/privacy.ts` (Zero-leak network sentry models and CX compliance report schema)
- [x] Verify type-checking with `npx tsc --noEmit`

## Phase 3: Core Hardware, Simulator, AI & Privacy Services + Unit Tests
- [x] Create `src/services/webhidService.ts` (Native WebHID connection, permission handling, raw DataView to hex/HID++ parser)
- [x] Create `src/services/simulatorService.ts` (Interactive Logitech MX Master 3S simulator with RF interference, Battery drain, Firmware desync, Healthy state, Custom Hex injection, and resolution state mutations)
- [x] Create `src/services/chromeAiService.ts` (Chrome Prompt API `window.ai.languageModel` integration, system prompt engineering, JSON response sanitization, and deterministic local fallback engine)
- [x] Create `src/services/privacyAuditService.ts` (Zero-leak network traffic monitor and compliance audit exporter)
- [x] Create unit test suite `src/services/__tests__/services.test.ts` and verify all tests pass via `npm test`

## Phase 4: Dynamic Diagnostic UI Components & Application Assembly
- [x] Create `src/components/Navbar.tsx` (Status badges for WebHID, Chrome AI, and Zero-Leak Monitor)
- [x] Create `src/components/DeviceSelector.tsx` (Dual-mode switcher, scenario selector, and custom hex injector)
- [x] Create `src/components/TelemetryViewer.tsx` (Live metric gauges, sparkline bars, and raw hex packet inspector)
- [x] Create `src/components/AiDiagnosticCard.tsx` (Plain-English diagnosis, severity badge, confidence meter, and expandable L2/L3 technical report)
- [x] Create `src/components/ResolutionPanel.tsx` (One-click hardware resolution triggers with real-time telemetry healing feedback)
- [x] Create `src/components/ZeroLeakAuditModal.tsx` & `src/components/ChromeAiSetupModal.tsx`
- [x] Create `src/App.tsx` and `src/main.tsx`
- [x] Run full test suite (`npm test`), production build (`npm run build`), and verify live HTTP serving

## Phase 5: Engaging Engineering Guide (`project_explained.html`), `lessons.md` & Walkthrough
- [x] Update `lessons.md` with complete architectural decisions, tradeoffs, bugs encountered, and fixes
- [x] Create `project_explained.html` (Comprehensive, engaging plain-language deep dive with analogies, architecture diagrams, code breakdown, decisions, and engineering lessons)
- [x] Verify all files and create final `walkthrough.md` artifact

## Phase 6: Support Chatbot Integration (`postMessage` Bridge & Interactive Bot Test Harness)
- [x] Create `src/services/supportBotBridge.ts` (`window.postMessage` emitter, intent-to-WebHID trigger mapper, and RMA deflection evaluator)
- [x] Create `src/components/SupportBotDrawer.tsx` (Interactive CX Support Chatbot simulator showing customer symptom input, live `postMessage` JSON payloads, and automated RMA deflection)
- [x] Wire `SupportBotDrawer` and `supportBotBridge` into `src/App.tsx` and `src/components/Navbar.tsx`
- [x] Add unit & integration tests for the Support Bot bridge and verify with `npm test` and `npm run build`
- [x] Update `lessons.md` and `project_explained.html` with the Support Chatbot `postMessage` & `iframe allow="hid"` architecture

## Phase 7: Logitech Multi-Category Device Catalog Dropdown & Connected WebHID Discovery
- [x] Expand `src/types/webhid.ts` with `LOGITECH_DEVICE_CATALOG` covering Mice, Keyboards, Headsets, Webcams, Gaming G-Series, and USB Receivers
- [x] Update `src/services/webhidService.ts` and `src/services/simulatorService.ts` to enumerate paired physical WebHID devices (`getDevices()`) and generate device-specific telemetry (firmware prefixes, polling rates, and device metadata)
- [x] Update `src/components/DeviceSelector.tsx` and `src/App.tsx` to include a categorized Logitech Device Dropdown + Connected Physical Devices selector
- [x] Add unit tests in `src/services/__tests__/services.test.ts` and `src/__tests__/App.test.tsx`, run `npm test` and `npm run build`, and update `lessons.md`

## Phase 8: Category-Specific Fault Profiles & AI Diagnostics (Webcams/BRIO, Keyboards, Headsets, Mice)
- [x] Update `src/services/simulatorService.ts` with `getScenarioDescriptorsForCategory(category)` so Webcams (like Logitech BRIO), Keyboards, Headsets, and Mice display authentic category-specific fault profiles
- [x] Update `src/services/chromeAiService.ts` and `src/components/TelemetryViewer.tsx` so telemetry register labels, AI root causes, and 1-click remediation actions adapt to the active device category (e.g., USB 3.0 UVC Bandwidth & 5V VBUS rail for BRIO Webcams vs. 2.4GHz RF & Li-Po Battery for Wireless Mice/Keyboards)
- [x] Update `src/components/DeviceSelector.tsx`, `src/components/SupportBotDrawer.tsx`, and `src/App.tsx` to pass `device.category` and trigger immediate telemetry refresh when switching devices
- [x] Add unit tests for Webcam (BRIO) & Category-Specific diagnostics, verify with `npm test` and `npm run build`, and update `lessons.md`
