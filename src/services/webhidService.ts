import {
  LOGITECH_VENDOR_ID,
  LOGITECH_PRODUCTS,
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
 * Layout convention (after reportId byte):
 * [0]: Device Index (0xFF or 0x01)
 * [1]: Feature Index (0x18 = RF, 0x10 = Battery, 0x03 = Firmware)
 * [2..3]: Battery Voltage in mV (Uint16 Big Endian, e.g., 0x0F3C = 3900mV)
 * [4]: Packet Drop Rate % (0 - 100)
 * [5]: Absolute RSSI dBm magnitude (e.g., 52 => -52 dBm)
 * [6]: Cell Internal Impedance * 100 (e.g., 9 => 0.09 Ohms, 42 => 0.42 Ohms)
 * [7]: Hardware Error Bitmask
 * [8..9]: Polling Rate Hz (Uint16 Big Endian, e.g., 0x03E8 = 1000Hz)
 * [10]: USB 3.0 2.4GHz Noise Floor dB
 * [11]: Firmware Build Patch (0x24 = B0036 nominal, < 0x20 = outdated)
 */
export function parseHidReportToFrame(
  reportId: number,
  data: DataView,
  scenario: ScenarioId = 'custom_hex'
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
  const pollingRateHz = rawPolling >= 60 && rawPolling <= 4000 ? rawPolling : 1000;

  const usb3NoiseFloorDb = getByte(10, 12);
  const fwBuildByte = getByte(11, 0x24);
  const firmwareVersion =
    fwBuildByte < 0x20
      ? `RQR24.00_B00${fwBuildByte.toString(16).toUpperCase().padStart(2, '0')}`
      : `RQR24.01_B00${fwBuildByte.toString(16).toUpperCase().padStart(2, '0')}`;

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

  const productName =
    device.productName ||
    LOGITECH_PRODUCTS[device.productId] ||
    `HID Peripheral (0x${device.vendorId.toString(16)}:${device.productId.toString(16)})`;

  const deviceData: WebHIDDeviceData = {
    vendorId: device.vendorId,
    productId: device.productId,
    productName,
    opened: device.opened,
    collections: (device.collections || []).map((c) => ({
      usagePage: c.usagePage ?? 0xff00,
      usage: c.usage ?? 0x0001,
    })),
    isSimulated: false,
  };

  return { deviceData, nativeDevice: device };
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
