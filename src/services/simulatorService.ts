import { HIDPP_REPORT_ID, LOGITECH_VENDOR_ID, WebHIDDeviceData } from '../types/webhid';
import {
  ResolutionActionType,
  ScenarioId,
  TelemetryFrame,
} from '../types/diagnostics';
import { encodeFlagBitmask, parseHidReportToFrame } from './webhidService';

export interface ScenarioDescriptor {
  id: ScenarioId;
  name: string;
  shortTag: string;
  symptomSummary: string;
  sampleHex: string;
}

export const SCENARIO_DESCRIPTORS: ScenarioDescriptor[] = [
  {
    id: 'rf_interference',
    name: '2.4GHz RF & USB 3.0 Interference',
    shortTag: 'RF Dropouts',
    symptomSummary: 'Cursor stuttering & intermittent 150ms freezes near unshielded USB 3.0 hub.',
    sampleHex: '11 FF 18 0F 3C 18 56 09 03 03 E8 24 24 00 00 00 00 00 00 00',
  },
  {
    id: 'battery_degradation',
    name: 'Battery Cell Sag & Gauge Drift',
    shortTag: 'Battery Drain',
    symptomSummary: 'Sudden power cutoffs at 30% reported charge; rapid voltage sag under load.',
    sampleHex: '11 FF 10 0C A8 01 34 2C 0C 03 E8 0C 24 00 00 00 00 00 00 00',
  },
  {
    id: 'firmware_desync',
    name: 'Firmware Subversion & NVRAM Desync',
    shortTag: 'FW Desync',
    symptomSummary: 'Wake-from-sleep lag and polling rate locked at 125Hz after OS sleep cycle.',
    sampleHex: '11 FF 03 0F 1E 04 38 0A 30 00 7D 0E 18 00 00 00 00 00 00 00',
  },
  {
    id: 'healthy_nominal',
    name: 'Healthy Nominal Peripheral',
    shortTag: 'Optimal',
    symptomSummary: '1000Hz Logi Bolt link stable, clean Li-Po discharge curve, zero packet loss.',
    sampleHex: '11 FF 18 0F B4 00 30 08 00 03 E8 0B 24 00 00 00 00 00 00 00',
  },
  {
    id: 'custom_hex',
    name: 'Custom Raw Hex Report Injector',
    shortTag: 'Raw Hex',
    symptomSummary: 'Inject arbitrary HID++ 2.0 hexadecimal frames to test parser & AI diagnostics.',
    sampleHex: '11 FF 18 0D 48 1F 59 26 07 01 F4 25 19 00 00 00 00 00 00 00',
  },
];

export function getSimulatedDeviceMetadata(): WebHIDDeviceData {
  return {
    vendorId: LOGITECH_VENDOR_ID,
    productId: 0xb034,
    productName: 'Logitech MX Master 3S (Simulated HID++ 2.0)',
    opened: true,
    collections: [
      { usagePage: 0xff00, usage: 0x0001 },
      { usagePage: 0xff00, usage: 0x0002 },
    ],
    isSimulated: true,
  };
}

export function generateSimulatedFrame(
  scenario: ScenarioId,
  tick = 0
): TelemetryFrame {
  const payload = new Uint8Array(19);
  const jitter = (tick % 3) - 1; // -1, 0, +1 deterministic oscillation

  // Byte 0: Device index (0xFF = receiver/corded or 0x01 = slot 1)
  payload[0] = 0xff;

  switch (scenario) {
    case 'rf_interference': {
      payload[1] = 0x18; // RF Signal Quality feature
      const volt = 3900 + jitter * 5;
      payload[2] = (volt >> 8) & 0xff;
      payload[3] = volt & 0xff;
      payload[4] = Math.max(15, 24 + jitter * 2); // 22-26% packet drop
      payload[5] = 86 + jitter; // -86 dBm RSSI
      payload[6] = 9; // 0.09 Ohms
      payload[7] = encodeFlagBitmask([
        'ERR_USB3_RF_NOISE_FLOOR_HIGH',
        'ERR_PACKET_RETRANSMIT_OVERFLOW',
      ]);
      const polling = 1000;
      payload[8] = (polling >> 8) & 0xff;
      payload[9] = polling & 0xff;
      payload[10] = 36 + jitter; // 36dB USB 3.0 noise floor
      payload[11] = 0x24; // FW B0036
      break;
    }

    case 'battery_degradation': {
      payload[1] = 0x10; // Battery feature
      const volt = 3240 + jitter * 15; // Sagging to 3.24V
      payload[2] = (volt >> 8) & 0xff;
      payload[3] = volt & 0xff;
      payload[4] = 1; // 1% packet drop
      payload[5] = 52; // -52 dBm RSSI
      payload[6] = 44 + jitter; // 0.44 Ohms degraded cell impedance
      payload[7] = encodeFlagBitmask([
        'ERR_BATT_VOLTAGE_SAG_UNDER_LOAD',
        'ERR_CELL_HIGH_IMPEDANCE',
      ]);
      const polling = 1000;
      payload[8] = (polling >> 8) & 0xff;
      payload[9] = polling & 0xff;
      payload[10] = 12;
      payload[11] = 0x24;
      break;
    }

    case 'firmware_desync': {
      payload[1] = 0x03; // Firmware Info feature
      const volt = 3870;
      payload[2] = (volt >> 8) & 0xff;
      payload[3] = volt & 0xff;
      payload[4] = 4; // 4% drop
      payload[5] = 56; // -56 dBm
      payload[6] = 10; // 0.10 Ohms
      payload[7] = encodeFlagBitmask([
        'ERR_NVRAM_CRC_MISMATCH',
        'ERR_FW_SUBVERSION_OUTDATED',
      ]);
      const polling = 125; // Locked at 125Hz due to NVRAM desync
      payload[8] = (polling >> 8) & 0xff;
      payload[9] = polling & 0xff;
      payload[10] = 14;
      payload[11] = 0x18; // Outdated FW build B0018
      break;
    }

    case 'healthy_nominal':
    default: {
      payload[1] = 0x18;
      const volt = 4020 + jitter * 2;
      payload[2] = (volt >> 8) & 0xff;
      payload[3] = volt & 0xff;
      payload[4] = 0; // 0% packet drop
      payload[5] = 48 + jitter; // -48 dBm strong signal
      payload[6] = 8; // 0.08 Ohms healthy cell
      payload[7] = 0x00; // No error flags
      const polling = 1000;
      payload[8] = (polling >> 8) & 0xff;
      payload[9] = polling & 0xff;
      payload[10] = 11; // Low noise floor
      payload[11] = 0x24; // Latest firmware B0036
      break;
    }
  }

  // Add deterministic sequence counter at byte 12
  payload[12] = tick & 0xff;

  const view = new DataView(payload.buffer);
  return parseHidReportToFrame(HIDPP_REPORT_ID.LONG, view, scenario);
}

export function applyResolutionAction(
  currentFrame: TelemetryFrame,
  actionType: ResolutionActionType
): { updatedFrame: TelemetryFrame; executionLog: string } {
  const healedFrame = generateSimulatedFrame('healthy_nominal', 99);

  switch (actionType) {
    case 'HOP_RF_CHANNEL':
      return {
        updatedFrame: {
          ...healedFrame,
          metrics: {
            ...currentFrame.metrics,
            rssiDbm: -49,
            packetDropRatePct: 0,
            usb3NoiseFloorDb: 12,
            errorFlags: currentFrame.metrics.errorFlags.filter(
              (f) =>
                f !== 'ERR_USB3_RF_NOISE_FLOOR_HIGH' &&
                f !== 'ERR_PACKET_RETRANSMIT_OVERFLOW'
            ),
          },
        },
        executionLog:
          'TX HID++ [11 FF 18 0A 4C 00]: Shifted transceiver from Ch.14 (2.414GHz) to Ch.76 (2.476GHz) above USB 3.0 spread-spectrum harmonic.',
      };

    case 'RECALIBRATE_BATTERY_GAUGE':
      return {
        updatedFrame: {
          ...healedFrame,
          metrics: {
            ...currentFrame.metrics,
            batteryVoltageMv: 3820,
            batteryLevelPct: 68,
            internalImpedanceOhms: 0.14,
            errorFlags: currentFrame.metrics.errorFlags.filter(
              (f) =>
                f !== 'ERR_BATT_VOLTAGE_SAG_UNDER_LOAD' &&
                f !== 'ERR_CELL_HIGH_IMPEDANCE'
            ),
          },
        },
        executionLog:
          'TX HID++ [11 FF 10 04 C2 01]: Reset ADC coulomb counter LUT & enabled dynamic peak-load smoothing.',
      };

    case 'SOFT_FIRMWARE_RESET':
      return {
        updatedFrame: {
          ...healedFrame,
          metrics: {
            ...currentFrame.metrics,
            firmwareVersion: 'RQR24.01_B0024',
            nvramSyncValid: true,
            pollingRateHz: 1000,
            packetDropRatePct: 0,
            errorFlags: currentFrame.metrics.errorFlags.filter(
              (f) =>
                f !== 'ERR_NVRAM_CRC_MISMATCH' &&
                f !== 'ERR_FW_SUBVERSION_OUTDATED'
            ),
          },
        },
        executionLog:
          'TX HID++ [11 FF 00 0F AA 55]: Purged corrupted NVRAM profile cache, restored CRC checksum, and unlocked 1000Hz report rate.',
      };

    case 'OPTIMIZE_POLLING_RATE':
    default:
      return {
        updatedFrame: healedFrame,
        executionLog:
          'TX HID++ [11 FF 80 60 01 00]: Synchronized host/device report interval to 1ms (1000Hz).',
      };
  }
}
