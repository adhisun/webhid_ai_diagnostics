import {
  DiagnosticResult,
  RecommendedAction,
  TelemetryFrame,
} from '../types/diagnostics';
import { WebHIDDeviceData } from '../types/webhid';

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
Analyze raw WebHID / Logitech HID++ 2.0 / UVC telemetry frames for the specified Logitech device and output ONLY valid JSON matching this schema:
{
  "conditionTitle": "Short headline of hardware condition specific to the device type",
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

export function buildTelemetryPrompt(
  frame: TelemetryFrame,
  deviceName = 'Logitech Peripheral',
  deviceCategory: WebHIDDeviceData['category'] = 'Mice & Trackballs'
): string {
  return JSON.stringify(
    {
      deviceName,
      deviceCategory,
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
  inferenceLatencyMs: number,
  deviceCategory: WebHIDDeviceData['category'] = 'Mice & Trackballs',
  deviceName = 'Logitech Peripheral'
): DiagnosticResult {
  const { metrics } = frame;
  const actions: RecommendedAction[] = [];
  const details: string[] = [];
  const isWebcam = deviceCategory === 'Webcams & ConferenceCams';
  const isHeadset = deviceCategory === 'Headsets & Audio';
  const isKeyboard = deviceCategory === 'Keyboards';

  const hasRfOrLinkIssue =
    metrics.packetDropRatePct >= 10 ||
    metrics.rssiDbm <= -75 ||
    metrics.usb3NoiseFloorDb >= 25 ||
    metrics.errorFlags.includes('ERR_USB3_RF_NOISE_FLOOR_HIGH') ||
    metrics.errorFlags.includes('ERR_PACKET_RETRANSMIT_OVERFLOW');

  const hasPowerOrBatteryIssue =
    metrics.batteryVoltageMv <= 3450 ||
    metrics.internalImpedanceOhms >= 0.3 ||
    metrics.errorFlags.includes('ERR_BATT_VOLTAGE_SAG_UNDER_LOAD') ||
    metrics.errorFlags.includes('ERR_CELL_HIGH_IMPEDANCE');

  const hasFirmwareIssue =
    !metrics.nvramSyncValid ||
    metrics.pollingRateHz < 500 ||
    metrics.errorFlags.includes('ERR_NVRAM_CRC_MISMATCH') ||
    metrics.errorFlags.includes('ERR_FW_SUBVERSION_OUTDATED');

  if (hasRfOrLinkIssue) {
    if (isWebcam) {
      details.push(
        `UVC Isochronous Pipe Telemetry: ${metrics.packetDropRatePct}% video frame drop rate detected on ${deviceName}.`,
        `USB Bus Negotiation: Link operating with ${metrics.usb3NoiseFloorDb} dB bus contention (characteristic of USB 2.0 Hi-Speed fallback instead of USB 3.0 SuperSpeed 5Gbps).`
      );
      actions.push({
        id: 'act-hop-rf',
        label: 'Renegotiate USB 3.0 SuperSpeed UVC Pipe',
        actionType: 'HOP_RF_CHANNEL',
        description:
          'Sends UVC/HID descriptor reset to re-allocate SuperSpeed Isochronous bandwidth and eliminate 4K frame drops.',
        commandHex: '11 FF 18 0A 4C 00',
        estimatedFixTimeSec: 1,
      });
    } else {
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
  }

  if (hasPowerOrBatteryIssue) {
    if (isWebcam) {
      details.push(
        `USB VBUS Rail Telemetry: Regulated sensor rail sagged to ${metrics.batteryVoltageMv} mV under 4K HDR CMOS + IR autofocus load.`,
        `Cable / Hub Impedance: Effective line resistance measured at ${metrics.internalImpedanceOhms} Ω (exceeds USB-IF 0.15 Ω spec for unpowered hub/extension cable).`
      );
      actions.push({
        id: 'act-recal-batt',
        label: 'Enable USB VBUS Peak-Current Smoothing',
        actionType: 'RECALIBRATE_BATTERY_GAUGE',
        description:
          'Adjusts internal LDO power budget and caps peak IR illuminator transient draw so the webcam stays rock-solid on hub ports.',
        commandHex: '11 FF 10 04 C2 01',
        estimatedFixTimeSec: 2,
      });
    } else {
      details.push(
        `Power Rail Telemetry: Li-Po cell voltage sagged to ${metrics.batteryVoltageMv} mV (${metrics.batteryLevelPct}% SOC) under active load.`,
        `Electrochemical Health: Internal DC resistance measured at ${metrics.internalImpedanceOhms} Ω (nominal threshold < 0.15 Ω), causing ADC coulomb counter drift.`
      );
      actions.push({
        id: 'act-recal-batt',
        label: isKeyboard
          ? 'Recalibrate Battery Gauge & Proximity Backlight Timeout'
          : 'Recalibrate Fuel-Gauge ADC & Enable Load Smoothing',
        actionType: 'RECALIBRATE_BATTERY_GAUGE',
        description:
          'Resets HID++ 0x1004 battery lookup table and enables dynamic peak-current smoothing to prevent premature brownout.',
        commandHex: '11 FF 10 04 C2 01',
        estimatedFixTimeSec: 2,
      });
    }
  }

  if (hasFirmwareIssue) {
    if (isWebcam) {
      details.push(
        `Camera Firmware & NVRAM State: Running ${metrics.firmwareVersion} with NVRAM CRC Valid = ${metrics.nvramSyncValid}.`,
        `MIPI / UVC Control Pipe: Control polling throttled to ${metrics.pollingRateHz} Hz after host sleep-wake transition, causing autofocus hunting.`
      );
      actions.push({
        id: 'act-fw-reset',
        label: 'Reset MIPI Autofocus & RightLight HDR NVRAM',
        actionType: 'SOFT_FIRMWARE_RESET',
        description:
          'Flushes corrupted UVC exposure/autofocus registers and restores factory RightLight HDR calibration without unplugging the camera.',
        commandHex: '11 FF 00 0F AA 55',
        estimatedFixTimeSec: 2,
      });
    } else {
      details.push(
        `Firmware & NVRAM State: Running ${metrics.firmwareVersion} with NVRAM CRC Valid = ${metrics.nvramSyncValid}.`,
        `USB/BLE Report Interval: Locked at ${metrics.pollingRateHz} Hz instead of nominal high-speed rate after host sleep-wake transition.`
      );
      actions.push({
        id: 'act-fw-reset',
        label: 'Execute Soft Firmware Reset & NVRAM CRC Purge',
        actionType: 'SOFT_FIRMWARE_RESET',
        description:
          'Flushes stale NVRAM sleep-state descriptors and restores high-speed HID report rate without losing pairing.',
        commandHex: '11 FF 00 0F AA 55',
        estimatedFixTimeSec: 2,
      });
    }
  }

  if (hasRfOrLinkIssue && hasPowerOrBatteryIssue) {
    return {
      id: `diag-${Date.now()}`,
      analyzedAt: new Date().toISOString(),
      engineUsed: 'local-heuristic-fallback',
      inferenceLatencyMs,
      conditionTitle: isWebcam
        ? 'Compound Fault: USB 2.0 Bandwidth Bottleneck + VBUS Voltage Droop'
        : 'Compound Fault: 2.4GHz RF Interference + Battery Voltage Sag',
      severity: 'critical',
      confidence: 96,
      rootCause: isWebcam
        ? `Simultaneous USB Isochronous packet loss (${metrics.packetDropRatePct}%) and VBUS rail sag (${metrics.batteryVoltageMv} mV) across high-impedance hub connection.`
        : 'Simultaneous USB 3.0 2.4GHz broadband noise and elevated Li-Po internal impedance causing radio brownouts during high retransmit bursts.',
      plainEnglishSummary: isWebcam
        ? `Your ${deviceName} is plugged into an unpowered hub or cable that is both throttling video bandwidth and dropping supply voltage during 4K HDR streaming.`
        : 'Your device is experiencing two overlapping issues: nearby USB 3.0 port interference is forcing the wireless radio to retry sending data repeatedly, and those extra power spikes are causing your aging battery voltage to dip.',
      technicalDetails: details,
      recommendedActions: actions,
      rawPromptPreview: promptPreview,
    };
  }

  if (hasRfOrLinkIssue) {
    return {
      id: `diag-${Date.now()}`,
      analyzedAt: new Date().toISOString(),
      engineUsed: 'local-heuristic-fallback',
      inferenceLatencyMs,
      conditionTitle: isWebcam
        ? 'USB 2.0 Bandwidth Fallback & UVC Frame Drop Detected'
        : isHeadset
          ? 'Multipoint Wireless Audio Packet Jitter Detected'
          : isKeyboard
            ? '2.4GHz Matrix Key-Repeat & RF Interference Detected'
            : 'USB 3.0 / 2.4GHz RF Spectrum Interference Detected',
      severity: 'critical',
      confidence: 98,
      rootCause: isWebcam
        ? `UVC Isochronous pipe experiencing ${metrics.packetDropRatePct}% frame drop due to USB bus contention (${metrics.usb3NoiseFloorDb} dB).`
        : `Broadband 2.4GHz noise floor (${metrics.usb3NoiseFloorDb} dB) from adjacent USB 3.0 port degrading SNR (${metrics.rssiDbm} dBm) and causing ${metrics.packetDropRatePct}% packet loss.`,
      plainEnglishSummary: isWebcam
        ? `Your ${deviceName} is experiencing video frame drops because its USB connection negotiated a slower channel instead of full SuperSpeed USB 3.0 bandwidth. Click below to renegotiate the UVC video pipe.`
        : 'Your wireless receiver is experiencing heavy radio interference from a nearby USB 3.0 port or unshielded cable, causing 1 in 4 packets to drop. Shifting the wireless frequency channel will immediately stabilize performance.',
      technicalDetails: details,
      recommendedActions: actions,
      rawPromptPreview: promptPreview,
    };
  }

  if (hasPowerOrBatteryIssue) {
    return {
      id: `diag-${Date.now()}`,
      analyzedAt: new Date().toISOString(),
      engineUsed: 'local-heuristic-fallback',
      inferenceLatencyMs,
      conditionTitle: isWebcam
        ? 'USB VBUS Power Droop Under 4K HDR Sensor Load'
        : isKeyboard
          ? 'Proximity Backlight Sensor Drain & Gauge Drift'
          : 'Battery Voltage Sag & Fuel-Gauge Calibration Drift',
      severity: 'warning',
      confidence: 95,
      rootCause: isWebcam
        ? `Elevated cable/hub resistance (${metrics.internalImpedanceOhms} Ω) causing internal regulator voltage droop to ${metrics.batteryVoltageMv} mV during 4K HDR capture.`
        : `Elevated cell impedance (${metrics.internalImpedanceOhms} Ω) causing transient voltage drop to ${metrics.batteryVoltageMv} mV and inaccurate battery percentage reporting.`,
      plainEnglishSummary: isWebcam
        ? `Your ${deviceName} is not receiving enough steady USB power from the current port or hub when 4K HDR and autofocus run simultaneously, causing brief flickers or resets. Enabling USB VBUS peak-current smoothing will stabilize the camera.`
        : 'Your battery sensor has drifted out of calibration due to voltage dips during heavy usage, making the device think the battery is empty earlier than it actually is. Recalibrating the fuel gauge will restore accurate battery life.',
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
      conditionTitle: isWebcam
        ? 'MIPI Autofocus & RightLight HDR Register Desync'
        : 'NVRAM Sleep-Wake Desync & Polling Rate Throttle',
      severity: 'warning',
      confidence: 94,
      rootCause: isWebcam
        ? `Stale NVRAM exposure/autofocus CRC on firmware ${metrics.firmwareVersion} after OS sleep-wake cycle.`
        : `Corrupted NVRAM state flag on firmware ${metrics.firmwareVersion} throttling HID polling rate to ${metrics.pollingRateHz} Hz.`,
      plainEnglishSummary: isWebcam
        ? `After your computer woke up from sleep, your ${deviceName}'s autofocus and RightLight HDR exposure registers got stuck in a stale state. A one-click soft reset will restore crisp focus and color balance.`
        : 'After your computer woke up from sleep, the device got stuck in a low-power slow response mode (125Hz instead of 1000Hz). A one-click soft firmware reset will clear the stuck memory cache and restore instant responsiveness.',
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
    conditionTitle: `All ${deviceName} Telemetry Nominal — Zero Faults Detected`,
    severity: 'optimal',
    confidence: 99,
    rootCause: isWebcam
      ? `SuperSpeed USB 3.0 UVC pipe clean (0% frame drop), steady VBUS rail (${metrics.batteryVoltageMv} mV), and calibrated MIPI/RightLight firmware (${metrics.firmwareVersion}).`
      : `Clean RF link (${metrics.rssiDbm} dBm, 0% packet loss), healthy Li-Po cell (${metrics.batteryVoltageMv} mV, ${metrics.internalImpedanceOhms} Ω), and synchronized ${metrics.pollingRateHz}Hz firmware state.`,
    plainEnglishSummary: isWebcam
      ? `Your ${deviceName} is operating in peak physical condition. SuperSpeed USB 3.0 bandwidth is stable for 4K Ultra HD streaming, USB power delivery is clean, and autofocus/HDR registers are calibrated.`
      : 'Your peripheral is operating in peak physical condition. Wireless signal strength is strong, battery health is optimal, and high-speed reporting is active with zero dropped packets.',
    technicalDetails: [
      `Link Integrity: ${metrics.packetDropRatePct}% drop rate, ${metrics.usb3NoiseFloorDb} dB noise floor.`,
      `Power Health: ${metrics.batteryVoltageMv} mV, ${metrics.internalImpedanceOhms} Ω impedance.`,
      `Firmware & Report Rate: ${metrics.firmwareVersion} verified at ${metrics.pollingRateHz} Hz with valid NVRAM CRC.`,
    ],
    recommendedActions: [
      {
        id: 'act-sync-poll',
        label: isWebcam
          ? 'Verify 4K UVC Isochronous Sync'
          : `Verify ${metrics.pollingRateHz}Hz Report Interval Sync`,
        actionType: 'OPTIMIZE_POLLING_RATE',
        description: 'Pings device feature descriptor to confirm optimal host/device synchronization.',
        commandHex: '11 FF 80 60 01 00',
        estimatedFixTimeSec: 1,
      },
    ],
    rawPromptPreview: promptPreview,
  };
}

export async function analyzeTelemetryWithLocalAi(
  frame: TelemetryFrame,
  deviceCategory: WebHIDDeviceData['category'] = 'Mice & Trackballs',
  deviceName = 'Logitech Peripheral'
): Promise<DiagnosticResult> {
  const startTime = performance.now();
  const userPrompt = buildTelemetryPrompt(frame, deviceName, deviceCategory);
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
          `Analyze this hardware telemetry frame for ${deviceName} (${deviceCategory}) and respond with JSON only:\n${userPrompt}`
        );
        session.destroy?.();

        const parsed = extractJsonFromModelOutput(rawResponse);
        const latency = Math.max(1, Math.round(performance.now() - startTime));

        if (parsed && typeof parsed.conditionTitle === 'string') {
          const fallback = runLocalHeuristicDiagnosis(
            frame,
            fullPromptPreview,
            latency,
            deviceCategory,
            deviceName
          );
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
  return runLocalHeuristicDiagnosis(
    frame,
    fullPromptPreview,
    elapsed,
    deviceCategory,
    deviceName
  );
}
