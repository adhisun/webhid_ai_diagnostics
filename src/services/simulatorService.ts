import {
  HIDPP_REPORT_ID,
  LOGITECH_DEVICE_CATALOG,
  LOGITECH_VENDOR_ID,
  WebHIDDeviceData,
} from '../types/webhid';
import {
  ResolutionActionType,
  ScenarioId,
  TelemetryFrame,
} from '../types/diagnostics';
import { encodeFlagBitmask, inferLogitechCategory, parseHidReportToFrame } from './webhidService';

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
    symptomSummary: 'Signal drops & intermittent 150ms freezes near unshielded USB 3.0 hub.',
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
    symptomSummary: 'High-speed link stable, clean Li-Po discharge curve, zero packet loss.',
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

export function getScenarioDescriptorsForCategory(
  category: WebHIDDeviceData['category']
): ScenarioDescriptor[] {
  if (category === 'Webcams & ConferenceCams') {
    return [
      {
        id: 'rf_interference',
        name: 'USB 2.0 Fallback & UVC Frame Drop',
        shortTag: 'UVC Bandwidth',
        symptomSummary:
          '4K/60fps locked out; video stuttering & USB Isochronous packet drops on hub.',
        sampleHex: '11 FF 18 0F 3C 18 56 09 03 03 E8 24 24 00 00 00 00 00 00 00',
      },
      {
        id: 'battery_degradation',
        name: 'USB VBUS Power Droop (Unpowered Hub)',
        shortTag: 'VBUS Power Sag',
        symptomSummary:
          'Camera disconnects or HDR sensor flickers; VBUS voltage sagging on long cable.',
        sampleHex: '11 FF 10 0C A8 01 34 2C 0C 03 E8 0C 24 00 00 00 00 00 00 00',
      },
      {
        id: 'firmware_desync',
        name: 'MIPI Autofocus & RightLight Desync',
        shortTag: 'AF/HDR Desync',
        symptomSummary:
          'Autofocus hunting & RightLight HDR exposure locked after OS sleep cycle.',
        sampleHex: '11 FF 03 0F 1E 04 38 0A 30 00 7D 0E 18 00 00 00 00 00 00 00',
      },
      {
        id: 'healthy_nominal',
        name: 'SuperSpeed USB 3.0 5Gbps Nominal',
        shortTag: '4K Optimal',
        symptomSummary:
          '4K Ultra HD 60fps UVC pipeline stable, steady VBUS rail, zero dropped frames.',
        sampleHex: '11 FF 18 0F B4 00 30 08 00 03 E8 0B 24 00 00 00 00 00 00 00',
      },
      SCENARIO_DESCRIPTORS[4],
    ];
  }

  if (category === 'Keyboards') {
    return [
      {
        id: 'rf_interference',
        name: '2.4GHz Matrix Latency & Key Chatter',
        shortTag: 'Key Dropouts',
        symptomSummary:
          'Missed keystrokes or delayed character repeat near unshielded USB 3.0 dock.',
        sampleHex: '11 FF 18 0F 3C 18 56 09 03 03 E8 24 24 00 00 00 00 00 00 00',
      },
      {
        id: 'battery_degradation',
        name: 'Backlight Proximity Sensor Battery Drain',
        shortTag: 'Backlight Drain',
        symptomSummary:
          'Rapid battery drain from stuck hand-proximity sensor keeping LEDs at 100%.',
        sampleHex: '11 FF 10 0C A8 01 34 2C 0C 03 E8 0C 24 00 00 00 00 00 00 00',
      },
      {
        id: 'firmware_desync',
        name: 'Fn-Row & OS Layout NVRAM Desync',
        shortTag: 'Layout Desync',
        symptomSummary:
          'Media keys & Easy-Switch channel state desynced after host sleep-wake.',
        sampleHex: '11 FF 03 0F 1E 04 38 0A 30 00 7D 0E 18 00 00 00 00 00 00 00',
      },
      SCENARIO_DESCRIPTORS[3],
      SCENARIO_DESCRIPTORS[4],
    ];
  }

  if (category === 'Headsets & Audio') {
    return [
      {
        id: 'rf_interference',
        name: 'Multipoint BLE / DECT Audio Packet Jitter',
        shortTag: 'Audio Dropouts',
        symptomSummary:
          'Robotic voice & wideband audio packet loss during Teams/Zoom calls.',
        sampleHex: '11 FF 18 0F 3C 18 56 09 03 03 E8 24 24 00 00 00 00 00 00 00',
      },
      {
        id: 'battery_degradation',
        name: 'Hybrid ANC High-Load Cell Voltage Sag',
        shortTag: 'ANC Battery Sag',
        symptomSummary:
          'Premature low-battery shutdown when Hybrid ANC + dual-mic DSP is active.',
        sampleHex: '11 FF 10 0C A8 01 34 2C 0C 03 E8 0C 24 00 00 00 00 00 00 00',
      },
      {
        id: 'firmware_desync',
        name: 'Boom-Mic Mute & Sidetone DSP Desync',
        shortTag: 'Mic DSP Desync',
        symptomSummary:
          'Flip-to-mute hardware switch out of sync with USB HID telephony mute flag.',
        sampleHex: '11 FF 03 0F 1E 04 38 0A 30 00 7D 0E 18 00 00 00 00 00 00 00',
      },
      SCENARIO_DESCRIPTORS[3],
      SCENARIO_DESCRIPTORS[4],
    ];
  }

  return SCENARIO_DESCRIPTORS;
}

export function getSimulatedDeviceMetadata(
  catalogId = 'mx-master-3s'
): WebHIDDeviceData {
  const entry =
    LOGITECH_DEVICE_CATALOG.find((item) => item.id === catalogId) ||
    LOGITECH_DEVICE_CATALOG[0];

  return {
    id: entry.id,
    vendorId: LOGITECH_VENDOR_ID,
    productId: entry.productId,
    productName: entry.name,
    category: entry.category,
    protocol: entry.protocol,
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
  tick = 0,
  catalogId = 'mx-master-3s',
  overrideProductName?: string,
  overrideProductId?: number
): TelemetryFrame {
  const entry = LOGITECH_DEVICE_CATALOG.find((item) => item.id === catalogId);
  const inferred = entry
    ? {
        defaultPollingHz: entry.defaultPollingHz,
        firmwarePrefix: entry.firmwarePrefix,
      }
    : {
        defaultPollingHz: 1000,
        firmwarePrefix: inferLogitechCategory(
          overrideProductId ?? 0x085e,
          overrideProductName ?? catalogId
        ).firmwarePrefix,
      };

  const payload = new Uint8Array(19);
  const jitter = (tick % 3) - 1; // -1, 0, +1 deterministic oscillation
  const nominalPolling = inferred.defaultPollingHz;

  // Byte 0: Device index (0xFF = receiver/corded or 0x01 = slot 1)
  payload[0] = 0xff;

  switch (scenario) {
    case 'rf_interference': {
      payload[1] = 0x18; // RF / Link Signal Quality feature
      const volt = 3900 + jitter * 5;
      payload[2] = (volt >> 8) & 0xff;
      payload[3] = volt & 0xff;
      payload[4] = Math.max(15, 24 + jitter * 2); // 22-26% packet/frame drop
      payload[5] = 86 + jitter; // -86 dBm RSSI
      payload[6] = 9; // 0.09 Ohms
      payload[7] = encodeFlagBitmask([
        'ERR_USB3_RF_NOISE_FLOOR_HIGH',
        'ERR_PACKET_RETRANSMIT_OVERFLOW',
      ]);
      payload[8] = (nominalPolling >> 8) & 0xff;
      payload[9] = nominalPolling & 0xff;
      payload[10] = 36 + jitter; // 36dB noise floor
      payload[11] = 0x24; // FW B0036
      break;
    }

    case 'battery_degradation': {
      payload[1] = 0x10; // Power / Battery feature
      const volt = 3240 + jitter * 15; // Sagging voltage
      payload[2] = (volt >> 8) & 0xff;
      payload[3] = volt & 0xff;
      payload[4] = 1; // 1% packet drop
      payload[5] = 52; // -52 dBm RSSI
      payload[6] = 44 + jitter; // 0.44 Ohms impedance
      payload[7] = encodeFlagBitmask([
        'ERR_BATT_VOLTAGE_SAG_UNDER_LOAD',
        'ERR_CELL_HIGH_IMPEDANCE',
      ]);
      payload[8] = (nominalPolling >> 8) & 0xff;
      payload[9] = nominalPolling & 0xff;
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
      const polling = 125; // Throttled report/frame rate
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
      payload[8] = (nominalPolling >> 8) & 0xff;
      payload[9] = nominalPolling & 0xff;
      payload[10] = 11; // Low noise floor
      payload[11] = 0x24; // Latest firmware B0036
      break;
    }
  }

  payload[12] = tick & 0xff;

  const view = new DataView(payload.buffer);
  return parseHidReportToFrame(
    HIDPP_REPORT_ID.LONG,
    view,
    scenario,
    inferred.firmwarePrefix
  );
}

export function applyResolutionAction(
  currentFrame: TelemetryFrame,
  actionType: ResolutionActionType,
  catalogId = 'mx-master-3s',
  category: WebHIDDeviceData['category'] = 'Mice & Trackballs'
): { updatedFrame: TelemetryFrame; executionLog: string } {
  const entry =
    LOGITECH_DEVICE_CATALOG.find((item) => item.id === catalogId) ||
    LOGITECH_DEVICE_CATALOG[0];
  const healedFrame = generateSimulatedFrame('healthy_nominal', 99, catalogId);
  const isWebcam = category === 'Webcams & ConferenceCams';

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
        executionLog: isWebcam
          ? 'TX UVC/HID [11 FF 18 0A 4C 00]: Renegotiated USB 3.0 SuperSpeed Isochronous pipe & cleared UVC bulk-endpoint congestion.'
          : 'TX HID++ [11 FF 18 0A 4C 00]: Shifted transceiver from Ch.14 (2.414GHz) to Ch.76 (2.476GHz) above USB 3.0 spread-spectrum harmonic.',
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
        executionLog: isWebcam
          ? 'TX UVC/HID [11 FF 10 04 C2 01]: Enabled USB VBUS active peak-current limiter & stabilized 5.0V sensor LDO regulator.'
          : 'TX HID++ [11 FF 10 04 C2 01]: Reset ADC coulomb counter LUT & enabled dynamic peak-load smoothing.',
      };

    case 'SOFT_FIRMWARE_RESET':
      return {
        updatedFrame: {
          ...healedFrame,
          metrics: {
            ...currentFrame.metrics,
            firmwareVersion: `${entry.firmwarePrefix}_B0024`,
            nvramSyncValid: true,
            pollingRateHz: entry.defaultPollingHz,
            packetDropRatePct: 0,
            errorFlags: currentFrame.metrics.errorFlags.filter(
              (f) =>
                f !== 'ERR_NVRAM_CRC_MISMATCH' &&
                f !== 'ERR_FW_SUBVERSION_OUTDATED'
            ),
          },
        },
        executionLog: isWebcam
          ? 'TX UVC/HID [11 FF 00 0F AA 55]: Re-initialized MIPI autofocus actuator & restored RightLight 4K HDR NVRAM lookup tables.'
          : `TX HID++ [11 FF 00 0F AA 55]: Purged corrupted NVRAM profile cache, restored CRC checksum, and unlocked ${entry.defaultPollingHz}Hz report rate.`,
      };

    case 'OPTIMIZE_POLLING_RATE':
    default:
      return {
        updatedFrame: healedFrame,
        executionLog: `TX HID++ [11 FF 80 60 01 00]: Synchronized host/device report interval to ${entry.defaultPollingHz}Hz.`,
      };
  }
}
