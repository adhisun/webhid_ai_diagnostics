import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  dataViewToHex,
  decodeFlagBitmask,
  encodeFlagBitmask,
  hexToUint8Array,
  parseCustomHexStringToFrame,
} from '../webhidService';
import {
  applyResolutionAction,
  generateSimulatedFrame,
} from '../simulatorService';
import {
  analyzeTelemetryWithLocalAi,
  checkChromeAiAvailability,
  extractJsonFromModelOutput,
} from '../chromeAiService';
import { privacyAuditSentry } from '../privacyAuditService';
import {
  emitSupportBotPostMessage,
  mapCustomerSymptomToScenario,
} from '../supportBotBridge';

describe('WebHID Protocol & Telemetry Parser Service', () => {
  it('converts hex strings to Uint8Array and back via DataView', () => {
    const rawHex = '11 FF 18 0F 3C 18 56 09 03 03 E8 24 24';
    const bytes = hexToUint8Array(rawHex);
    expect(bytes.length).toBe(13);
    expect(bytes[0]).toBe(0x11);
    expect(bytes[2]).toBe(0x18);

    const view = new DataView(bytes.slice(1).buffer);
    const formatted = dataViewToHex(view, bytes[0]);
    expect(formatted).toBe(rawHex);
  });

  it('encodes and decodes hardware error flag bitmasks accurately', () => {
    const flags = ['ERR_USB3_RF_NOISE_FLOOR_HIGH', 'ERR_CELL_HIGH_IMPEDANCE'];
    const mask = encodeFlagBitmask(flags);
    expect(mask).toBe(0x01 | 0x08);

    const decoded = decodeFlagBitmask(mask);
    expect(decoded).toEqual(flags);
  });

  it('parses custom hex strings into structured telemetry frames', () => {
    // Compound fault hex: 0x0D48 = 3400mV, 0x1F = 31% drop, 0x59 = -89dBm, 0x26 = 0.38 Ohms, 0x07 = flags
    const frame = parseCustomHexStringToFrame(
      '11 FF 18 0D 48 1F 59 26 07 01 F4 25 19 00 00 00 00 00 00 00'
    );
    expect(frame.reportId).toBe(0x11);
    expect(frame.metrics.batteryVoltageMv).toBe(3400);
    expect(frame.metrics.packetDropRatePct).toBe(31);
    expect(frame.metrics.rssiDbm).toBe(-89);
    expect(frame.metrics.internalImpedanceOhms).toBe(0.38);
    expect(frame.metrics.pollingRateHz).toBe(500);
    expect(frame.metrics.errorFlags).toContain('ERR_USB3_RF_NOISE_FLOOR_HIGH');
    expect(frame.metrics.errorFlags).toContain('ERR_BATT_VOLTAGE_SAG_UNDER_LOAD');
  });
});

describe('Hardware Telemetry Simulator & Resolution Engine', () => {
  it('generates distinct failure signatures for RF, Battery, and Firmware scenarios', () => {
    const rfFrame = generateSimulatedFrame('rf_interference', 1);
    expect(rfFrame.metrics.packetDropRatePct).toBeGreaterThanOrEqual(20);
    expect(rfFrame.metrics.rssiDbm).toBeLessThanOrEqual(-80);
    expect(rfFrame.metrics.errorFlags).toContain('ERR_USB3_RF_NOISE_FLOOR_HIGH');

    const battFrame = generateSimulatedFrame('battery_degradation', 1);
    expect(battFrame.metrics.batteryVoltageMv).toBeLessThan(3350);
    expect(battFrame.metrics.internalImpedanceOhms).toBeGreaterThan(0.35);

    const fwFrame = generateSimulatedFrame('firmware_desync', 1);
    expect(fwFrame.metrics.nvramSyncValid).toBe(false);
    expect(fwFrame.metrics.pollingRateHz).toBe(125);
  });

  it('heals telemetry metrics when one-click resolution actions are applied', () => {
    const rfFrame = generateSimulatedFrame('rf_interference', 0);
    const { updatedFrame, executionLog } = applyResolutionAction(
      rfFrame,
      'HOP_RF_CHANNEL'
    );
    expect(updatedFrame.metrics.packetDropRatePct).toBe(0);
    expect(updatedFrame.metrics.rssiDbm).toBeGreaterThan(-60);
    expect(updatedFrame.metrics.errorFlags).not.toContain('ERR_USB3_RF_NOISE_FLOOR_HIGH');
    expect(executionLog).toContain('Ch.76');
  });
});

describe('On-Device Chrome AI & Resilient Fallback Service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    delete (window as unknown as { ai?: unknown }).ai;
  });

  it('extracts JSON from markdown-fenced LLM output', () => {
    const raw = 'Here is the analysis:\n```json\n{"conditionTitle": "RF Fault", "confidence": 97}\n```';
    const parsed = extractJsonFromModelOutput(raw);
    expect(parsed).toEqual({ conditionTitle: 'RF Fault', confidence: 97 });
  });

  it('falls back to local heuristic diagnosis when window.ai is unavailable', async () => {
    const avail = await checkChromeAiAvailability();
    expect(avail).toBe('unavailable');

    const rfFrame = generateSimulatedFrame('rf_interference', 0);
    const result = await analyzeTelemetryWithLocalAi(rfFrame);

    expect(result.engineUsed).toBe('local-heuristic-fallback');
    expect(result.severity).toBe('critical');
    expect(result.conditionTitle).toContain('2.4GHz RF Spectrum Interference');
    expect(result.recommendedActions[0].actionType).toBe('HOP_RF_CHANNEL');
  });

  it('uses native window.ai.languageModel when available in Chrome', async () => {
    const mockPrompt = vi.fn().mockResolvedValue(
      JSON.stringify({
        conditionTitle: 'Gemini Nano Detected USB 3.0 Harmonic',
        severity: 'critical',
        confidence: 99,
        rootCause: 'Local Gemini Nano identified 2.4GHz packet loss.',
        plainEnglishSummary: 'Move your receiver away from the USB 3.0 port or hop channels.',
        technicalDetails: ['RSSI -86 dBm'],
      })
    );

    (window as unknown as { ai: unknown }).ai = {
      languageModel: {
        capabilities: async () => ({ available: 'readily' }),
        create: async () => ({
          prompt: mockPrompt,
          destroy: vi.fn(),
        }),
      },
    };

    const avail = await checkChromeAiAvailability();
    expect(avail).toBe('ready');

    const rfFrame = generateSimulatedFrame('rf_interference', 0);
    const result = await analyzeTelemetryWithLocalAi(rfFrame);

    expect(result.engineUsed).toBe('chrome-gemini-nano');
    expect(result.conditionTitle).toBe('Gemini Nano Detected USB 3.0 Harmonic');
    expect(mockPrompt).toHaveBeenCalledTimes(1);
  });
});

describe('Zero-Leak Privacy Audit Sentry', () => {
  beforeEach(() => {
    privacyAuditSentry.reset();
  });

  it('records local operations with deterministic SHA digests and 0 external bytes', () => {
    const entry = privacyAuditSentry.recordLocalOperation(
      'WEBHID_INGEST',
      '11 FF 18 0F 3C'
    );
    expect(entry.externalNetworkBytesSent).toBe(0);
    expect(entry.destination).toBe('LOCAL_BROWSER_SANDBOX_ONLY');
    expect(entry.telemetryDigestSha256).toMatch(/^sha256:local:[0-9a-f]{16}$/);

    const report = privacyAuditSentry.generateComplianceReport('Logitech MX Master 3S');
    expect(report.totalLocalFramesAnalyzed).toBe(1);
    expect(report.totalExternalBytesTransmitted).toBe(0);
    expect(report.gdprCcpaCompliant).toBe(true);
  });
});

describe('Support Chatbot postMessage Bridge Service', () => {
  it('maps natural language customer symptoms to hardware scan scenarios', () => {
    expect(mapCustomerSymptomToScenario('My battery dies at 30%')).toBe(
      'battery_degradation'
    );
    expect(mapCustomerSymptomToScenario('Mouse slow after sleep wake')).toBe(
      'firmware_desync'
    );
    expect(mapCustomerSymptomToScenario('Cursor stuttering near USB hub')).toBe(
      'rf_interference'
    );
  });

  it('emits window.postMessage payload with 0 external bytes and RMA deflection status', async () => {
    const postSpy = vi.spyOn(window, 'postMessage');
    const rfFrame = generateSimulatedFrame('rf_interference', 0);
    const diag = await analyzeTelemetryWithLocalAi(rfFrame);

    const payload = emitSupportBotPostMessage(
      diag,
      'HOP_RF_CHANNEL',
      'CX-ZERO-LEAK-999',
      'sha256:local:1234567890abcdef'
    );

    expect(payload.type).toBe('CX_HARDWARE_DIAGNOSIS_RESULT');
    expect(payload.ticketStatus).toBe('RESOLVED_RMA_DEFLECTED');
    expect(payload.externalBytesSent).toBe(0);
    expect(postSpy).toHaveBeenCalledWith(payload, '*');
  });
});
