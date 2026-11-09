/**
 * WebHID API & Logitech HID++ 2.0 Protocol Type Definitions
 */

// Logitech Vendor ID & Common Product IDs
export const LOGITECH_VENDOR_ID = 0x046d;

export const LOGITECH_PRODUCTS: Record<number, string> = {
  0xb034: 'Logitech MX Master 3S (BLE)',
  0xc548: 'Logitech Logi Bolt USB Receiver',
  0xc52b: 'Logitech Unifying USB Receiver',
  0x4082: 'Logitech MX Master 3',
  0xb023: 'Logitech MX Keys',
};

// Logitech HID++ Report IDs
export const HIDPP_REPORT_ID = {
  SHORT: 0x10,      // 7-byte HID++ report (1 byte reportId + 6 bytes payload)
  LONG: 0x11,       // 20-byte HID++ report (1 byte reportId + 19 bytes payload)
  VERY_LONG: 0x12,  // 64-byte HID++ report
} as const;

// Logitech HID++ 2.0 Feature IDs
export const HIDPP_FEATURE = {
  ROOT: 0x0000,
  FEATURE_SET: 0x0001,
  FIRMWARE_INFO: 0x0003,
  DEVICE_NAME: 0x0005,
  BATTERY_STATUS: 0x1000,
  BATTERY_VOLTAGE: 0x1001,
  UNIFIED_BATTERY: 0x1004,
  WIRELESS_DEVICE_STATUS: 0x1d4b,
  RF_SIGNAL_QUALITY: 0x1814,
  REPORT_RATE: 0x8060,
} as const;

export interface HIDCollectionInfo {
  usagePage: number;
  usage: number;
}

export interface WebHIDDeviceData {
  vendorId: number;
  productId: number;
  productName: string;
  opened: boolean;
  collections: HIDCollectionInfo[];
  isSimulated: boolean;
}

export interface WebHIDInputReportEvent extends Event {
  readonly device: WebHIDDeviceData;
  readonly reportId: number;
  readonly data: DataView;
}

export interface NativeHIDDevice {
  vendorId: number;
  productId: number;
  productName: string;
  opened: boolean;
  collections: Array<{ usagePage?: number; usage?: number }>;
  open(): Promise<void>;
  close(): Promise<void>;
  sendReport(reportId: number, data: BufferSource): Promise<void>;
  addEventListener(
    type: 'inputreport',
    listener: (event: { device: NativeHIDDevice; reportId: number; data: DataView }) => void
  ): void;
  removeEventListener(
    type: 'inputreport',
    listener: (event: { device: NativeHIDDevice; reportId: number; data: DataView }) => void
  ): void;
}

export interface NativeHID {
  requestDevice(options: {
    filters: Array<{
      vendorId?: number;
      productId?: number;
      usagePage?: number;
      usage?: number;
    }>;
  }): Promise<NativeHIDDevice[]>;
  getDevices(): Promise<NativeHIDDevice[]>;
}
