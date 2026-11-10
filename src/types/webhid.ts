/**
 * WebHID API & Logitech HID++ 2.0 Protocol Type Definitions
 */

// Logitech Vendor ID & Common Product IDs
export const LOGITECH_VENDOR_ID = 0x046d;

export type LogitechDeviceCategory =
  | 'Mice & Trackballs'
  | 'Keyboards'
  | 'Headsets & Audio'
  | 'Webcams & ConferenceCams'
  | 'Gaming (Logitech G)'
  | 'USB Receivers & Dongles';

export interface LogitechDeviceCatalogEntry {
  id: string;
  productId: number;
  name: string;
  category: LogitechDeviceCategory;
  protocol: string;
  defaultPollingHz: number;
  firmwarePrefix: string;
}

export const LOGITECH_DEVICE_CATALOG: LogitechDeviceCatalogEntry[] = [
  // Mice & Trackballs
  {
    id: 'mx-master-3s',
    productId: 0xb034,
    name: 'Logitech MX Master 3S Wireless Mouse',
    category: 'Mice & Trackballs',
    protocol: 'HID++ 2.0 (Logi Bolt / BLE)',
    defaultPollingHz: 1000,
    firmwarePrefix: 'RQR24.01',
  },
  {
    id: 'mx-anywhere-3s',
    productId: 0xb037,
    name: 'Logitech MX Anywhere 3S Compact Mouse',
    category: 'Mice & Trackballs',
    protocol: 'HID++ 2.0 (Logi Bolt / BLE)',
    defaultPollingHz: 1000,
    firmwarePrefix: 'RQR24.03',
  },
  {
    id: 'mx-ergo-s',
    productId: 0xb038,
    name: 'Logitech MX Ergo S Wireless Trackball',
    category: 'Mice & Trackballs',
    protocol: 'HID++ 2.0 (Logi Bolt / BLE)',
    defaultPollingHz: 1000,
    firmwarePrefix: 'RQR25.00',
  },
  {
    id: 'lift-vertical',
    productId: 0xb031,
    name: 'Logitech Lift Vertical Ergonomic Mouse',
    category: 'Mice & Trackballs',
    protocol: 'HID++ 2.0 (Logi Bolt / BLE)',
    defaultPollingHz: 1000,
    firmwarePrefix: 'RQR22.02',
  },

  // Keyboards
  {
    id: 'mx-keys-s',
    productId: 0xb378,
    name: 'Logitech MX Keys S Advanced Illuminated Keyboard',
    category: 'Keyboards',
    protocol: 'HID++ 2.0 (Logi Bolt / BLE)',
    defaultPollingHz: 1000,
    firmwarePrefix: 'RQR52.01',
  },
  {
    id: 'mx-mechanical',
    productId: 0xb366,
    name: 'Logitech MX Mechanical Wireless Illuminated Keyboard',
    category: 'Keyboards',
    protocol: 'HID++ 2.0 (Logi Bolt / BLE)',
    defaultPollingHz: 1000,
    firmwarePrefix: 'RQR51.02',
  },
  {
    id: 'ergo-k860',
    productId: 0x4088,
    name: 'Logitech ERGO K860 Split Ergonomic Keyboard',
    category: 'Keyboards',
    protocol: 'HID++ 2.0 (Unifying / BLE)',
    defaultPollingHz: 500,
    firmwarePrefix: 'RQR48.01',
  },
  {
    id: 'wave-keys',
    productId: 0xb37c,
    name: 'Logitech Wave Keys Wireless Ergonomic Keyboard',
    category: 'Keyboards',
    protocol: 'HID++ 2.0 (Logi Bolt / BLE)',
    defaultPollingHz: 1000,
    firmwarePrefix: 'RQR54.00',
  },
  {
    id: 'pebble-keys-2-k380s',
    productId: 0xb37a,
    name: 'Logitech Pebble Keys 2 K380s Multi-Device Keyboard',
    category: 'Keyboards',
    protocol: 'HID++ 2.0 (Logi Bolt / BLE)',
    defaultPollingHz: 500,
    firmwarePrefix: 'RQR53.01',
  },

  // Headsets & Audio
  {
    id: 'zone-wireless-2',
    productId: 0x0af2,
    name: 'Logitech Zone Wireless 2 AI ANC Headset',
    category: 'Headsets & Audio',
    protocol: 'USB-C HID Audio + BLE Telemetry',
    defaultPollingHz: 1000,
    firmwarePrefix: 'ZNW02.14',
  },
  {
    id: 'zone-vibe-125',
    productId: 0x0aee,
    name: 'Logitech Zone Vibe 125 Wireless Headphones',
    category: 'Headsets & Audio',
    protocol: 'USB-A Receiver HID + BLE',
    defaultPollingHz: 500,
    firmwarePrefix: 'ZNV01.08',
  },
  {
    id: 'h820e-wireless',
    productId: 0x0a4a,
    name: 'Logitech H820e DECT Enterprise Headset',
    category: 'Headsets & Audio',
    protocol: 'DECT Dock USB HID Telemetry',
    defaultPollingHz: 500,
    firmwarePrefix: 'DEC09.04',
  },

  // Webcams & ConferenceCams
  {
    id: 'mx-brio-4k',
    productId: 0x0946,
    name: 'Logitech MX Brio 4K Ultra HD Webcam',
    category: 'Webcams & ConferenceCams',
    protocol: 'USB 3.0 UVC + HID Sensor Telemetry',
    defaultPollingHz: 1000,
    firmwarePrefix: 'MXB03.11',
  },
  {
    id: 'brio-4k-pro',
    productId: 0x085e,
    name: 'Logitech Brio 4K Pro Enterprise Webcam',
    category: 'Webcams & ConferenceCams',
    protocol: 'USB 3.0 UVC + HID Telemetry',
    defaultPollingHz: 1000,
    firmwarePrefix: 'BRI02.09',
  },
  {
    id: 'rally-bar-collab',
    productId: 0x089b,
    name: 'Logitech Rally Bar Video Conferencing System',
    category: 'Webcams & ConferenceCams',
    protocol: 'CollabOS USB-C HID Diagnostics',
    defaultPollingHz: 1000,
    firmwarePrefix: 'RLY11.04',
  },

  // Gaming (Logitech G)
  {
    id: 'g-pro-x-superlight-2',
    productId: 0xc09b,
    name: 'Logitech G PRO X SUPERLIGHT 2 Gaming Mouse',
    category: 'Gaming (Logitech G)',
    protocol: 'HID++ 2.0 (LIGHTSPEED 4000Hz)',
    defaultPollingHz: 4000,
    firmwarePrefix: 'GPR32.04',
  },
  {
    id: 'g915-x-lightspeed',
    productId: 0xc353,
    name: 'Logitech G915 X LIGHTSPEED TKL Gaming Keyboard',
    category: 'Gaming (Logitech G)',
    protocol: 'HID++ 2.0 (LIGHTSPEED + RGB)',
    defaultPollingHz: 1000,
    firmwarePrefix: 'GKB19.02',
  },
  {
    id: 'g-pro-x-2-headset',
    productId: 0x0af0,
    name: 'Logitech G PRO X 2 LIGHTSPEED Wireless Gaming Headset',
    category: 'Gaming (Logitech G)',
    protocol: 'LIGHTSPEED USB DAC HID++',
    defaultPollingHz: 1000,
    firmwarePrefix: 'GHD14.06',
  },
  {
    id: 'g502-x-plus',
    productId: 0xc095,
    name: 'Logitech G502 X PLUS LIGHTSPEED Mouse',
    category: 'Gaming (Logitech G)',
    protocol: 'HID++ 2.0 (LIGHTSPEED)',
    defaultPollingHz: 1000,
    firmwarePrefix: 'G5218.01',
  },

  // USB Receivers & Dongles
  {
    id: 'logi-bolt-receiver',
    productId: 0xc548,
    name: 'Logitech Logi Bolt USB Receiver (Multi-Device)',
    category: 'USB Receivers & Dongles',
    protocol: 'HID++ 2.0 6-Slot BLE Security Level 4',
    defaultPollingHz: 1000,
    firmwarePrefix: 'RPR05.02',
  },
  {
    id: 'unifying-receiver',
    productId: 0xc52b,
    name: 'Logitech Unifying 2.4GHz USB Receiver',
    category: 'USB Receivers & Dongles',
    protocol: 'HID++ 2.0 6-Slot 2.4GHz RF',
    defaultPollingHz: 1000,
    firmwarePrefix: 'RQR12.11',
  },
  {
    id: 'lightspeed-receiver',
    productId: 0xc547,
    name: 'Logitech G LIGHTSPEED Pro 4K USB Dongle',
    category: 'USB Receivers & Dongles',
    protocol: 'HID++ 2.0 High-Speed RF',
    defaultPollingHz: 4000,
    firmwarePrefix: 'LS401.05',
  },
];

export const LOGITECH_PRODUCTS: Record<number, string> = Object.fromEntries(
  LOGITECH_DEVICE_CATALOG.map((item) => [item.productId, item.name])
);

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
  id: string;
  vendorId: number;
  productId: number;
  productName: string;
  category: LogitechDeviceCategory | 'Connected Physical HID';
  protocol: string;
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
