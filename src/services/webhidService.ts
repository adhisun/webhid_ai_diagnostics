import {
  LOGITECH_VENDOR_ID,
  LOGITECH_PRODUCTS,
  LOGITECH_DEVICE_CATALOG,
  HIDPP_REPORT_ID,
  NativeHID,
  NativeHIDDevice,
  WebHIDDeviceData,
} from '../types/webhid';
import { ParsedTelemetryMetrics, ScenarioId, TelemetryFrame } from '../types/diagnostics';

const FLAG_DEFINITIONS: Array<{ mask: number; code: string }> = [
  { mask: 0x01, code: 'ERR_USB3_RF_NOISE_FLOOR_HIGH' },
  { mask: 0x02, code: 'ERR_PACKET_RETRANSMIT_OVERFLOW' },
  { mask: 0x04, code: 'ERR_BATT_VOLTAGE_SAG_UNDER_LOAD' },
  { mask: 0x08, code: 'ERR_CELL_HIGH_IMPEDANCE' },
  { mask: 0x10, code: 'ERR_NVRAM_CRC_MISMATCH' },
  { mask: 0x20, code: 'ERR_FW_SUBVERSION_OUTDATED' },
];

export function isWebHIDSupported(): boolean {
  return typeof navigator !== 'undefined' && 'hid' in navigator;
}

export function dataViewToHex(data: DataView, reportId?: number): string {
  const bytes: string[] = [];
  if (typeof reportId === 'number') {
    bytes.push(reportId.toString(16).toUpperCase().padStart(2, '0'));
  }
  for (let i = 0; i < data.byteLength; i++) {
    bytes.push(data.getUint8(i).toString(16).toUpperCase().padStart(2, '0'));
  }
  return bytes.join(' ');
}

export function hexToUint8Array(hex: string): Uint8Array {
  const cleaned = hex
    .replace(/0x/gi, '')
    .replace(/[^0-9a-fA-F]/g, ' ')
    .trim();

  if (!cleaned) {
    return new Uint8Array(0);
  }

  const tokens = cleaned.split(/\s+/);
  const bytes: number[] = [];

  for (const token of tokens) {
    if (token.length <= 2) {
      bytes.push(parseInt(token, 16));
    } else {
      for (let i = 0; i < token.length; i += 2) {
        const pair = token.slice(i, i + 2);
        bytes.push(parseInt(pair, 16));
      }
    }
  }

  return new Uint8Array(bytes.filter((b) => !Number.isNaN(b)));
}

export function decodeFlagBitmask(bitmask: number): string[] {
  return FLAG_DEFINITIONS.filter((f) => (bitmask & f.mask) !== 0).map((f) => f.code);
}

export function encodeFlagBitmask(flags: string[]): number {
  let mask = 0;
  for (const def of FLAG_DEFINITIONS) {
    if (flags.includes(def.code)) {
      mask |= def.mask;
    }
  }
  return mask;
}

/**
 * Decodes a 20-byte HID++ 2.0 telemetry report (or custom hex buffer) into structured hardware metrics.
 */
export function parseHidReportToFrame(
  reportId: number,
  data: DataView,
  scenario: ScenarioId = 'custom_hex',
  firmwarePrefix = 'RQR24.01'
): TelemetryFrame {
  const getByte = (idx: number, fallback: number): number =>
    idx < data.byteLength ? data.getUint8(idx) : fallback;

  const featureByte = getByte(1, 0x18);
  const featureId = `0x${featureByte.toString(16).toUpperCase().padStart(4, '0')}`;

  const rawVolt = (getByte(2, 0x0f) << 8) | getByte(3, 0x3c);
  const batteryVoltageMv = rawVolt >= 2800 && rawVolt <= 4350 ? rawVolt : 3850;
  const batteryLevelPct = Math.max(
    1,
    Math.min(100, Math.round(((batteryVoltageMv - 3100) / (4150 - 3100)) * 100))
  );

  const packetDropRatePct = Math.min(100, getByte(4, 0));
  const rssiMagnitude = getByte(5, 52);
  const rssiDbm = -Math.max(30, Math.min(105, rssiMagnitude));

  const impedanceRaw = getByte(6, 9);
  const internalImpedanceOhms = Number((impedanceRaw / 100).toFixed(2));

  const flagByte = getByte(7, 0);
  const errorFlags = decodeFlagBitmask(flagByte);

  const rawPolling = (getByte(8, 0x03) << 8) | getByte(9, 0xe8);
  const pollingRateHz = rawPolling >= 60 && rawPolling <= 8000 ? rawPolling : 1000;

  const usb3NoiseFloorDb = getByte(10, 12);
  const fwBuildByte = getByte(11, 0x24);
  const basePrefix =
    fwBuildByte < 0x20
      ? firmwarePrefix.replace(/\.\d+$/, '.00')
      : firmwarePrefix;
  const firmwareVersion = `${basePrefix}_B00${fwBuildByte
    .toString(16)
    .toUpperCase()
    .padStart(2, '0')}`;

  const nvramSyncValid = (flagByte & 0x10) === 0;

  const metrics: ParsedTelemetryMetrics = {
    rssiDbm,
    packetDropRatePct,
    batteryVoltageMv,
    batteryLevelPct,
    internalImpedanceOhms,
    pollingRateHz,
    firmwareVersion,
    nvramSyncValid,
    usb3NoiseFloorDb,
    errorFlags,
  };

  return {
    id: `frm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    reportId,
    featureId,
    rawHex: dataViewToHex(data, reportId),
    scenario,
    metrics,
  };
}

export function inferLogitechCategory(
  productId: number,
  productName: string
): { category: WebHIDDeviceData['category']; protocol: string; firmwarePrefix: string } {
  const catalogMatch = LOGITECH_DEVICE_CATALOG.find(
    (entry) => entry.productId === productId
  );
  if (catalogMatch) {
    return {
      category: catalogMatch.category,
      protocol: catalogMatch.protocol,
      firmwarePrefix: catalogMatch.firmwarePrefix,
    };
  }

  const lower = (productName || '').toLowerCase();
  if (
    lower.includes('brio') ||
    lower.includes('webcam') ||
    lower.includes('rally') ||
    lower.includes('meetup') ||
    lower.includes('streamcam') ||
    lower.includes('c92') ||
    lower.includes('c93')
  ) {
    return {
      category: 'Webcams & ConferenceCams',
      protocol: 'USB 3.0 UVC + HID Telemetry',
      firmwarePrefix: 'BRI02.09',
    };
  }
  if (
    lower.includes('zone') ||
    lower.includes('headset') ||
    lower.includes('vibe') ||
    lower.includes('h820')
  ) {
    return {
      category: 'Headsets & Audio',
      protocol: 'USB-C HID Audio + BLE Telemetry',
      firmwarePrefix: 'ZNW02.14',
    };
  }
  if (
    lower.includes('key') ||
    lower.includes('k860') ||
    lower.includes('k380') ||
    lower.includes('mechanical') ||
    lower.includes('g915')
  ) {
    return {
      category: 'Keyboards',
      protocol: 'HID++ 2.0 (Logi Bolt / BLE)',
      firmwarePrefix: 'RQR52.01',
    };
  }
  if (
    lower.includes('bolt') ||
    lower.includes('unifying') ||
    lower.includes('receiver') ||
    lower.includes('dongle')
  ) {
    return {
      category: 'USB Receivers & Dongles',
      protocol: 'HID++ 2.0 Multi-Slot USB Receiver',
      firmwarePrefix: 'RPR05.02',
    };
  }
  if (lower.includes('superlight') || lower.includes('g502') || lower.includes('lightspeed')) {
    return {
      category: 'Gaming (Logitech G)',
      protocol: 'HID++ 2.0 (LIGHTSPEED)',
      firmwarePrefix: 'GPR32.04',
    };
  }

  return {
    category: 'Connected Physical HID',
    protocol: 'Live WebHID USB/Bluetooth Interface',
    firmwarePrefix: 'RQR24.01',
  };
}

export function mapNativeDeviceToData(
  device: NativeHIDDevice,
  index = 0
): WebHIDDeviceData {
  const productName =
    device.productName ||
    LOGITECH_PRODUCTS[device.productId] ||
    `HID Peripheral (0x${device.vendorId.toString(16).toUpperCase()}:0x${device.productId
      .toString(16)
      .toUpperCase()})`;

  const inferred = inferLogitechCategory(device.productId, productName);

  return {
    id: `phys-${device.vendorId}-${device.productId}-${index}`,
    vendorId: device.vendorId,
    productId: device.productId,
    productName,
    category: inferred.category,
    protocol: inferred.protocol,
    opened: device.opened,
    collections: (device.collections || []).map((c) => ({
      usagePage: c.usagePage ?? 0xff00,
      usage: c.usage ?? 0x0001,
    })),
    isSimulated: false,
  };
}

export async function getAuthorizedPhysicalWebHIDDevices(): Promise<
  Array<{ deviceData: WebHIDDeviceData; nativeDevice: NativeHIDDevice }>
> {
  if (!isWebHIDSupported()) {
    return [];
  }
  try {
    const hid = (navigator as unknown as { hid: NativeHID }).hid;
    const devices = await hid.getDevices();
    return (devices || []).map((dev, idx) => ({
      deviceData: mapNativeDeviceToData(dev, idx),
      nativeDevice: dev,
    }));
  } catch {
    return [];
  }
}

export async function requestPhysicalWebHIDDevice(
  filterLogitechOnly = false
): Promise<{ deviceData: WebHIDDeviceData; nativeDevice: NativeHIDDevice } | null> {
  if (!isWebHIDSupported()) {
    throw new Error('WebHID API is not supported in this browser environment.');
  }

  const hid = (navigator as unknown as { hid: NativeHID }).hid;
  const filters = filterLogitechOnly ? [{ vendorId: LOGITECH_VENDOR_ID }] : [];
  const devices = await hid.requestDevice({ filters });

  if (!devices || devices.length === 0) {
    return null;
  }

  const device = devices[0];
  if (!device.opened) {
    await device.open();
  }

  return {
    deviceData: mapNativeDeviceToData(device, Date.now() % 1000),
    nativeDevice: device,
  };
}

export function parseCustomHexStringToFrame(hexInput: string): TelemetryFrame {
  const bytes = hexToUint8Array(hexInput);
  if (bytes.length === 0) {
    throw new Error('Hex input contains no valid hexadecimal bytes.');
  }

  const firstByte = bytes[0];
  const hasReportIdPrefix =
    firstByte === HIDPP_REPORT_ID.SHORT ||
    firstByte === HIDPP_REPORT_ID.LONG ||
    firstByte === HIDPP_REPORT_ID.VERY_LONG;

  const reportId = hasReportIdPrefix ? firstByte : HIDPP_REPORT_ID.LONG;
  const payloadBytes = hasReportIdPrefix ? bytes.slice(1) : bytes;

  const padded = new Uint8Array(Math.max(19, payloadBytes.length));
  padded.set(payloadBytes);

  const view = new DataView(padded.buffer);
  return parseHidReportToFrame(reportId, view, 'custom_hex');
}
