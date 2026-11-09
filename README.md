# Zero-Friction On-Device Hardware Diagnostics (WebHID + Chrome AI)

An on-device hardware diagnostics prototype combining the **WebHID API** (`navigator.hid`), **Logitech HID++ 2.0 binary telemetry decoding**, and **Chrome's Built-In Prompt API (`window.ai.languageModel` / Gemini Nano)** with a resilient local heuristic fallback engine, a **Zero-Leak Compliance Ledger**, and an interactive **CX Support Bot `postMessage` Test Harness**.

## Key Features
- **Dual-Mode Hardware Ingestion**: Pair physical USB/Bluetooth peripherals via WebHID or simulate authentic 20-byte HID++ 2.0 fault frames (2.4GHz RF / USB 3.0 interference, Li-Po battery cell sag, NVRAM sleep-wake desync, or custom raw hex bytes).
- **On-Device AI Root-Cause Engine**: Uses Chrome's local `window.ai.languageModel` (Gemini Nano) when enabled, automatically falling back to an on-device deterministic diagnostic engine with 0 bytes of cloud egress.
- **One-Click Hardware Remediation**: Sends bidirectional `device.sendReport()` commands to hop RF channels, recalibrate battery fuel-gauge ADCs, or purge stale NVRAM state.
- **Support Chatbot Sandbox (`window.postMessage`)**: Interactive test harness demonstrating how Zendesk / Intercom / Salesforce bots trigger local scans and receive sanitized `CX_HARDWARE_DIAGNOSIS_RESULT` receipts (`RESOLVED_RMA_DEFLECTED`).
- **Zero-Leak Privacy Audit**: Synchronous SHA-256 local telemetry ledger verifying `0 Bytes` transmitted over external networks, with 1-click JSON Compliance Certificate export.

## Quick Start

```bash
npm install
npm run dev
```

Open **http://localhost:5173** in Chrome or Edge.
You can also open [`project_explained.html`](./project_explained.html) for an engaging, plain-language deep dive into the architecture, binary packet layout, technical tradeoffs, and engineering lessons.

## Testing & Production Build

```bash
npm test
npm run build
```
