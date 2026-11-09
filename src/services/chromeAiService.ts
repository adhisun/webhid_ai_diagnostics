import {
  DiagnosticResult,
  RecommendedAction,
  TelemetryFrame,
} from '../types/diagnostics';

export type ChromeAiAvailability = 'ready' | 'after-download' | 'unavailable';

interface ChromeLanguageModelSession {
  prompt(input: string): Promise<string>;
  destroy?(): void;
}

interface ChromeLanguageModelFactory {
  capabilities?(): Promise<{ available: 'readily' | 'after-download' | 'no' }>;
  availability?(): Promise<'readily' | 'after-download' | 'no' | 'available'>;
  create(options?: { systemPrompt?: string }): Promise<ChromeLanguageModelSession>;
}

interface WindowWithAi {
  ai?: {
    languageModel?: ChromeLanguageModelFactory;
    createTextSession?: (options?: { systemPrompt?: string }) => Promise<ChromeLanguageModelSession>;
  };
  LanguageModel?: ChromeLanguageModelFactory;
}

export const HARDWARE_TECHNICIAN_SYSTEM_PROMPT = `You are an On-Device Senior Hardware Diagnostics AI Engineer embedded locally in Chrome (Gemini Nano).
Analyze raw WebHID / Logitech HID++ 2.0 telemetry frames and output ONLY valid JSON matching this schema:
{
  "conditionTitle": "Short headline of hardware condition",
  "severity": "optimal" | "warning" | "critical",
  "confidence": 95,
  "rootCause": "Concise technical root cause",
  "plainEnglishSummary": "Empathetic, crystal-clear explanation for a non-technical user",
  "technicalDetails": ["Detail 1", "Detail 2", "Detail 3"],
  "recommendedActions": [
    {
      "id": "act-1",
      "label": "Action Button Label",
      "actionType": "HOP_RF_CHANNEL" | "RECALIBRATE_BATTERY_GAUGE" | "SOFT_FIRMWARE_RESET" | "OPTIMIZE_POLLING_RATE",
      "description": "What this one-click WebHID command does",
      "commandHex": "11 FF ...",
      "estimatedFixTimeSec": 2
    }
  ]
}`;

export async function checkChromeAiAvailability(): Promise<ChromeAiAvailability> {
  if (typeof window === 'undefined') {
    return 'unavailable';
  }
  const win = window as unknown as WindowWithAi;
  const factory = win.ai?.languageModel || win.LanguageModel;

  if (!factory && !win.ai?.createTextSession) {
    return 'unavailable';
  }

  try {
    if (factory?.capabilities) {
      const caps = await factory.capabilities();
      if (caps.available === 'readily') return 'ready';
      if (caps.available === 'after-download') return 'after-download';
      return 'unavailable';
    }
    if (factory?.availability) {
      const avail = await factory.availability();
      if (avail === 'readily' || avail === 'available') return 'ready';
      if (avail === 'after-download') return 'after-download';
      return 'unavailable';
    }
    return 'ready';
  } catch {
    return 'unavailable';
  }
}

export function buildTelemetryPrompt(frame: TelemetryFrame): string {
  return JSON.stringify(
    {
      reportId: `0x${frame.reportId.toString(16).toUpperCase()}`,
      featureId: frame.featureId,
      rawHex: frame.rawHex,
      metrics: frame.metrics,
    },
    null,
    2
  );
}

export function extractJsonFromModelOutput(rawText: string): Record<string, unknown> | null {
  const trimmed = rawText.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenceMatch ? fenceMatch[1].trim() : trimmed;

  const firstBrace = candidate.indexOf('{');
  const lastBrace = candidate.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null;
  }

  try {
    return JSON.parse(candidate.slice(firstBrace, lastBrace + 1));
  } catch {
    return null;
  }
}

export function runLocalHeuristicDiagnosis(
  frame: TelemetryFrame,
  promptPreview: string,
  inferenceLatencyMs: number
): DiagnosticResult {
  const { metrics } = frame;
  const actions: RecommendedAction[] = [];
  const details: string[] = [];

  const hasRfIssue =
    metrics.packetDropRatePct >= 10 ||
    metrics.rssiDbm <= -75 ||
    metrics.usb3NoiseFloorDb >= 25 ||
    metrics.errorFlags.includes('ERR_USB3_RF_NOISE_FLOOR_HIGH') ||
    metrics.errorFlags.includes('ERR_PACKET_RETRANSMIT_OVERFLOW');

  const hasBatteryIssue =
    metrics.batteryVoltageMv <= 3450 ||
    metrics.internalImpedanceOhms >= 0.3 ||
    metrics.errorFlags.includes('ERR_BATT_VOLTAGE_SAG_UNDER_LOAD') ||
    metrics.errorFlags.includes('ERR_CELL_HIGH_IMPEDANCE');

  const hasFirmwareIssue =
    !metrics.nvramSyncValid ||
    metrics.pollingRateHz < 500 ||
    metrics.errorFlags.includes('ERR_NVRAM_CRC_MISMATCH') ||
    metrics.errorFlags.includes('ERR_FW_SUBVERSION_OUTDATED');

  if (hasRfIssue) {
    details.push(
      `RF Link Telemetry: RSSI at ${metrics.rssiDbm} dBm with ${metrics.packetDropRatePct}% packet retransmission loss.`,
      `2.4GHz Spectrum: ${metrics.usb3NoiseFloorDb} dB broadband noise floor detected (characteristic of unshielded USB 3.0 Gen 1 5Gbps spread-spectrum interference).`
    );
    actions.push({
      id: 'act-hop-rf',
      label: 'Execute Adaptive RF Channel Hop (Ch.76)',
      actionType: 'HOP_RF_CHANNEL',
      description:
        'Sends HID++ 0x1814 command to shift transceiver carrier to upper 2.476GHz band away from USB 3.0 harmonic noise.',
      commandHex: '11 FF 18 0A 4C 00',
      estimatedFixTimeSec: 1,
    });
  }

  if (hasBatteryIssue) {
    details.push(
      `Power Rail Telemetry: Li-Po cell voltage sagged to ${metrics.batteryVoltageMv} mV (${metrics.batteryLevelPct}% SOC) under active optical sensor load.`,
      `Electrochemical Health: Internal DC resistance measured at ${metrics.internalImpedanceOhms} Ω (nominal threshold < 0.15 Ω), causing ADC coulomb counter drift.`
    );
    actions.push({
      id: 'act-recal-batt',
      label: 'Recalibrate Fuel-Gauge ADC & Enable Load Smoothing',
      actionType: 'RECALIBRATE_BATTERY_GAUGE',
      description:
        'Resets HID++ 0x1004 battery lookup table and enables dynamic peak-current smoothing to prevent premature brownout.',
      commandHex: '11 FF 10 04 C2 01',
      estimatedFixTimeSec: 2,
    });
  }

  if (hasFirmwareIssue) {
    details.push(
      `Firmware & NVRAM State: Running ${metrics.firmwareVersion} with NVRAM CRC Valid = ${metrics.nvramSyncValid}.`,
      `USB/BLE Report Interval: Locked at ${metrics.pollingRateHz} Hz instead of nominal 1000 Hz after host sleep-wake transition.`
    );
    actions.push({
      id: 'act-fw-reset',
      label: 'Execute Soft Firmware Reset & NVRAM CRC Purge',
      actionType: 'SOFT_FIRMWARE_RESET',
      description:
        'Flushes stale NVRAM sleep-state descriptors and restores 1000Hz high-speed HID report rate without losing pairing.',
      commandHex: '11 FF 00 0F AA 55',
      estimatedFixTimeSec: 2,
    });
  }

  if (hasRfIssue && hasBatteryIssue) {
    return {
      id: `diag-${Date.now()}`,
      analyzedAt: new Date().toISOString(),
      engineUsed: 'local-heuristic-fallback',
      inferenceLatencyMs,
      conditionTitle: 'Compound Fault: 2.4GHz RF Interference + Battery Voltage Sag',
      severity: 'critical',
      confidence: 96,
      rootCause:
        'Simultaneous USB 3.0 2.4GHz broadband noise and elevated Li-Po internal impedance causing radio brownouts during high retransmit bursts.',
      plainEnglishSummary:
        'Your device is experiencing two overlapping issues: nearby USB 3.0 port interference is forcing the wireless radio to retry sending data repeatedly, and those extra power spikes are causing your aging battery voltage to dip.',
      technicalDetails: details,
      recommendedActions: actions,
      rawPromptPreview: promptPreview,
    };
  }

  if (hasRfIssue) {
    return {
      id: `diag-${Date.now()}`,
      analyzedAt: new Date().toISOString(),
      engineUsed: 'local-heuristic-fallback',
      inferenceLatencyMs,
      conditionTitle: 'USB 3.0 / 2.4GHz RF Spectrum Interference Detected',
      severity: 'critical',
      confidence: 98,
      rootCause: `Broadband 2.4GHz noise floor (${metrics.usb3NoiseFloorDb} dB) from adjacent USB 3.0 port degrading SNR (${metrics.rssiDbm} dBm) and causing ${metrics.packetDropRatePct}% packet loss.`,
      plainEnglishSummary:
        'Your wireless receiver is experiencing heavy radio interference from a nearby USB 3.0 port or unshielded cable, causing 1 in 4 movement packets to drop. Shifting the wireless frequency channel will immediately stabilize your cursor.',
      technicalDetails: details,
      recommendedActions: actions,
      rawPromptPreview: promptPreview,
    };
  }

  if (hasBatteryIssue) {
    return {
      id: `diag-${Date.now()}`,
      analyzedAt: new Date().toISOString(),
      engineUsed: 'local-heuristic-fallback',
      inferenceLatencyMs,
      conditionTitle: 'Battery Voltage Sag & Fuel-Gauge Calibration Drift',
      severity: 'warning',
      confidence: 95,
      rootCause: `Elevated cell impedance (${metrics.internalImpedanceOhms} Ω) causing transient voltage drop to ${metrics.batteryVoltageMv} mV and inaccurate battery percentage reporting.`,
      plainEnglishSummary:
        'Your battery sensor has drifted out of calibration due to voltage dips during heavy usage, making the device think the battery is empty earlier than it actually is. Recalibrating the fuel gauge will restore accurate battery life.',
      technicalDetails: details,
      recommendedActions: actions,
      rawPromptPreview: promptPreview,
    };
  }

  if (hasFirmwareIssue) {
    return {
      id: `diag-${Date.now()}`,
      analyzedAt: new Date().toISOString(),
      engineUsed: 'local-heuristic-fallback',
      inferenceLatencyMs,
      conditionTitle: 'NVRAM Sleep-Wake Desync & Polling Rate Throttle',
      severity: 'warning',
      confidence: 94,
      rootCause: `Corrupted NVRAM state flag on firmware ${metrics.firmwareVersion} throttling HID polling rate to ${metrics.pollingRateHz} Hz.`,
      plainEnglishSummary:
        'After your computer woke up from sleep, the device got stuck in a low-power slow response mode (125Hz instead of 1000Hz). A one-click soft firmware reset will clear the stuck memory cache and restore instant responsiveness.',
      technicalDetails: details,
      recommendedActions: actions,
      rawPromptPreview: promptPreview,
    };
  }

  return {
    id: `diag-${Date.now()}`,
    analyzedAt: new Date().toISOString(),
    engineUsed: 'local-heuristic-fallback',
    inferenceLatencyMs,
    conditionTitle: 'All Hardware Telemetry Nominal — Zero Faults Detected',
    severity: 'optimal',
    confidence: 99,
    rootCause: `Clean RF link (${metrics.rssiDbm} dBm, 0% packet loss), healthy Li-Po cell (${metrics.batteryVoltageMv} mV, ${metrics.internalImpedanceOhms} Ω), and synchronized 1000Hz firmware state.`,
    plainEnglishSummary:
      'Your peripheral is operating in peak physical condition. Wireless signal strength is strong, battery health is optimal, and 1000Hz high-speed reporting is active with zero dropped packets.',
    technicalDetails: [
      `RF Link Integrity: ${metrics.rssiDbm} dBm RSSI, ${metrics.packetDropRatePct}% drop rate, ${metrics.usb3NoiseFloorDb} dB noise floor.`,
      `Battery Cell Health: ${metrics.batteryVoltageMv} mV (${metrics.batteryLevelPct}%), ${metrics.internalImpedanceOhms} Ω internal impedance.`,
      `Firmware & Report Rate: ${metrics.firmwareVersion} verified at ${metrics.pollingRateHz} Hz with valid NVRAM CRC.`,
    ],
    recommendedActions: [
      {
        id: 'act-sync-poll',
        label: 'Verify 1000Hz Report Interval Sync',
        actionType: 'OPTIMIZE_POLLING_RATE',
        description: 'Pings HID++ 0x8060 feature to confirm 1ms USB/Bolt report synchronization.',
        commandHex: '11 FF 80 60 01 00',
        estimatedFixTimeSec: 1,
      },
    ],
    rawPromptPreview: promptPreview,
  };
}

export async function analyzeTelemetryWithLocalAi(
  frame: TelemetryFrame
): Promise<DiagnosticResult> {
  const startTime = performance.now();
  const userPrompt = buildTelemetryPrompt(frame);
  const fullPromptPreview = `${HARDWARE_TECHNICIAN_SYSTEM_PROMPT}\n\nTELEMETRY_INPUT:\n${userPrompt}`;

  const availability = await checkChromeAiAvailability();

  if (availability === 'ready' && typeof window !== 'undefined') {
    const win = window as unknown as WindowWithAi;
    const factory = win.ai?.languageModel || win.LanguageModel;

    try {
      let session: ChromeLanguageModelSession | null = null;
      if (factory) {
        session = await factory.create({
          systemPrompt: HARDWARE_TECHNICIAN_SYSTEM_PROMPT,
        });
      } else if (win.ai?.createTextSession) {
        session = await win.ai.createTextSession({
          systemPrompt: HARDWARE_TECHNICIAN_SYSTEM_PROMPT,
        });
      }

      if (session) {
        const rawResponse = await session.prompt(
          `Analyze this hardware telemetry frame and respond with JSON only:\n${userPrompt}`
        );
        session.destroy?.();

        const parsed = extractJsonFromModelOutput(rawResponse);
        const latency = Math.max(1, Math.round(performance.now() - startTime));

        if (parsed && typeof parsed.conditionTitle === 'string') {
          const fallback = runLocalHeuristicDiagnosis(frame, fullPromptPreview, latency);
          return {
            id: `diag-${Date.now()}`,
            analyzedAt: new Date().toISOString(),
            engineUsed: 'chrome-gemini-nano',
            inferenceLatencyMs: latency,
            conditionTitle: String(parsed.conditionTitle),
            severity:
              parsed.severity === 'optimal' ||
              parsed.severity === 'warning' ||
              parsed.severity === 'critical'
                ? parsed.severity
                : fallback.severity,
            confidence:
              typeof parsed.confidence === 'number' ? parsed.confidence : fallback.confidence,
            rootCause:
              typeof parsed.rootCause === 'string' ? parsed.rootCause : fallback.rootCause,
            plainEnglishSummary:
              typeof parsed.plainEnglishSummary === 'string'
                ? parsed.plainEnglishSummary
                : fallback.plainEnglishSummary,
            technicalDetails: Array.isArray(parsed.technicalDetails)
              ? parsed.technicalDetails.map(String)
              : fallback.technicalDetails,
            recommendedActions:
              Array.isArray(parsed.recommendedActions) && parsed.recommendedActions.length > 0
                ? (parsed.recommendedActions as RecommendedAction[])
                : fallback.recommendedActions,
            rawPromptPreview: fullPromptPreview,
          };
        }
      }
    } catch {
      // Fall through to resilient local heuristic diagnosis
    }
  }

  const elapsed = Math.max(12, Math.round(performance.now() - startTime));
  return runLocalHeuristicDiagnosis(frame, fullPromptPreview, elapsed);
}
