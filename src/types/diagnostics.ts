/**
 * Hardware Telemetry & AI Diagnostic Schema Definitions
 */

export type ScenarioId =
  | 'rf_interference'
  | 'battery_degradation'
  | 'firmware_desync'
  | 'healthy_nominal'
  | 'custom_hex';

export type DiagnosticSeverity = 'optimal' | 'warning' | 'critical';

export interface ParsedTelemetryMetrics {
  rssiDbm: number;            // Signal strength in dBm (e.g., -45 optimal, -88 poor)
  packetDropRatePct: number;  // Percentage of dropped/retransmitted HID packets (0 - 100)
  batteryVoltageMv: number;   // Li-Po battery voltage in millivolts (3000 - 4200mV)
  batteryLevelPct: number;    // Estimated state of charge (0 - 100%)
  internalImpedanceOhms: number; // Estimated cell impedance (0.08 optimal, >0.35 degraded)
  pollingRateHz: number;      // Active report rate in Hz (e.g. 125, 250, 1000)
  firmwareVersion: string;    // e.g., "RQR24.01_B0036"
  nvramSyncValid: boolean;    // True if NVRAM profile checksum matches
  usb3NoiseFloorDb: number;   // 2.4GHz noise floor caused by USB 3.0 proximity
  errorFlags: string[];       // Decoded hardware flag codes
}

export interface TelemetryFrame {
  id: string;
  timestamp: string;
  reportId: number;
  featureId: string;
  rawHex: string;
  scenario: ScenarioId;
  metrics: ParsedTelemetryMetrics;
}

export type ResolutionActionType =
  | 'HOP_RF_CHANNEL'
  | 'RECALIBRATE_BATTERY_GAUGE'
  | 'SOFT_FIRMWARE_RESET'
  | 'OPTIMIZE_POLLING_RATE';

export interface RecommendedAction {
  id: string;
  label: string;
  actionType: ResolutionActionType;
  description: string;
  commandHex: string;
  estimatedFixTimeSec: number;
}

export interface DiagnosticResult {
  id: string;
  analyzedAt: string;
  engineUsed: 'chrome-gemini-nano' | 'local-heuristic-fallback';
  inferenceLatencyMs: number;
  conditionTitle: string;
  severity: DiagnosticSeverity;
  confidence: number;
  rootCause: string;
  plainEnglishSummary: string;
  technicalDetails: string[];
  recommendedActions: RecommendedAction[];
  rawPromptPreview: string;
}
