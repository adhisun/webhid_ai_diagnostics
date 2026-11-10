import React, { useState } from 'react';
import {
  Radio,
  BatteryWarning,
  Cpu,
  CheckCircle2,
  Terminal,
  Usb,
  Play,
  AlertCircle,
  Layers,
} from 'lucide-react';
import { ScenarioId } from '../types/diagnostics';
import {
  LOGITECH_DEVICE_CATALOG,
  LogitechDeviceCategory,
  WebHIDDeviceData,
} from '../types/webhid';
import { getScenarioDescriptorsForCategory } from '../services/simulatorService';

interface DeviceSelectorProps {
  activeDevice: WebHIDDeviceData;
  pairedPhysicalDevices: WebHIDDeviceData[];
  activeScenario: ScenarioId;
  webHidSupported: boolean;
  customHexInput: string;
  connectionError: string | null;
  onSelectCatalogDevice: (catalogId: string) => void;
  onSelectPhysicalDevice: (deviceId: string) => void;
  onSelectScenario: (scenario: ScenarioId) => void;
  onCustomHexChange: (hex: string) => void;
  onInjectCustomHex: () => void;
  onConnectPhysicalDevice: () => void;
}

const CATEGORIES: LogitechDeviceCategory[] = [
  'Mice & Trackballs',
  'Keyboards',
  'Headsets & Audio',
  'Webcams & ConferenceCams',
  'Gaming (Logitech G)',
  'USB Receivers & Dongles',
];

const SCENARIO_ICONS: Record<ScenarioId, React.ReactNode> = {
  rf_interference: <Radio className="w-4 h-4 text-rose-400" />,
  battery_degradation: <BatteryWarning className="w-4 h-4 text-amber-400" />,
  firmware_desync: <Cpu className="w-4 h-4 text-orange-400" />,
  healthy_nominal: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
  custom_hex: <Terminal className="w-4 h-4 text-cyan-400" />,
};

export const DeviceSelector: React.FC<DeviceSelectorProps> = ({
  activeDevice,
  pairedPhysicalDevices,
  activeScenario,
  webHidSupported,
  customHexInput,
  connectionError,
  onSelectCatalogDevice,
  onSelectPhysicalDevice,
  onSelectScenario,
  onCustomHexChange,
  onInjectCustomHex,
  onConnectPhysicalDevice,
}) => {
  const [hexError, setHexError] = useState<string | null>(null);

  const handleDropdownChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val.startsWith('phys-')) {
      onSelectPhysicalDevice(val);
    } else {
      onSelectCatalogDevice(val);
    }
  };

  const handleInject = () => {
    if (!customHexInput.trim()) {
      setHexError('Please enter at least 1 byte of hexadecimal data.');
      return;
    }
    setHexError(null);
    onInjectCustomHex();
  };

  const hexVid = `0x${activeDevice.vendorId.toString(16).toUpperCase().padStart(4, '0')}`;
  const hexPid = `0x${activeDevice.productId.toString(16).toUpperCase().padStart(4, '0')}`;

  return (
    <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-xl">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-400">
            Step 1 · Hardware Ingestion Source &amp; Logitech Device Selector
          </span>
          <h2 className="text-base font-semibold text-white mt-0.5">
            Choose a Connected Peripheral or Any Logitech Device Model
          </h2>
        </div>

        {/* Device Dropdown + Pair Physical WebHID Button */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5">
            <Layers className="w-4 h-4 text-cyan-400 shrink-0" />
            <label htmlFor="logitech-device-dropdown" className="sr-only">
              Select Logitech or Connected HID Device
            </label>
            <select
              id="logitech-device-dropdown"
              value={activeDevice.id}
              onChange={handleDropdownChange}
              className="bg-slate-950 text-xs font-medium text-slate-100 focus:outline-none cursor-pointer pr-2"
            >
              {pairedPhysicalDevices.length > 0 && (
                <optgroup label="Physically Connected WebHID Peripherals (Live)">
                  {pairedPhysicalDevices.map((phys) => (
                    <option key={phys.id} value={phys.id}>
                      🟢 [Live USB/BLE] {phys.productName}
                    </option>
                  ))}
                </optgroup>
              )}

              {CATEGORIES.map((category) => (
                <optgroup key={category} label={`Logitech — ${category}`}>
                  {LOGITECH_DEVICE_CATALOG.filter(
                    (item) => item.category === category
                  ).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} (0x{item.productId.toString(16).toUpperCase()})
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={onConnectPhysicalDevice}
            className={`px-3.5 py-2 rounded-xl text-xs font-medium border transition flex items-center gap-2 cursor-pointer ${
              !activeDevice.isSimulated
                ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-200'
                : 'bg-slate-950 hover:bg-slate-800 border-slate-700 text-slate-200'
            }`}
          >
            <Usb className="w-3.5 h-3.5 text-cyan-400" />
            <span>
              {webHidSupported
                ? 'Pair Physical USB/BLE Device (WebHID)'
                : 'Pair Physical Device (WebHID Unsupported)'}
            </span>
          </button>
        </div>
      </div>

      {/* Active Peripheral Metadata Strip */}
      <div className="mt-3 px-3.5 py-2 rounded-xl bg-slate-950/80 border border-slate-800/90 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-mono text-[11px]">
            {activeDevice.category}
          </span>
          <span className="font-semibold text-white">
            {activeDevice.productName}
          </span>
          <span className="text-slate-400 font-mono text-[11px]">
            VID:PID {hexVid}:{hexPid}
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
          <span>Protocol: <strong className="text-slate-200">{activeDevice.protocol}</strong></span>
          <span
            className={`px-2 py-0.5 rounded ${
              activeDevice.isSimulated
                ? 'bg-purple-500/15 text-purple-300'
                : 'bg-emerald-500/15 text-emerald-300'
            }`}
          >
            {activeDevice.isSimulated ? 'Simulated Telemetry' : 'Live Physical WebHID'}
          </span>
        </div>
      </div>

      {connectionError && (
        <div className="mt-3 p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-200">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">WebHID Notice: </span>
            {connectionError}
          </div>
        </div>
      )}

      {/* Scenario Profile Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-4">
        {getScenarioDescriptorsForCategory(activeDevice.category).map((desc) => {
          const isSelected = activeScenario === desc.id;
          return (
            <button
              key={desc.id}
              type="button"
              onClick={() => onSelectScenario(desc.id)}
              className={`text-left p-3.5 rounded-xl border transition flex flex-col justify-between gap-2 cursor-pointer ${
                isSelected
                  ? 'bg-slate-800/90 border-cyan-500/60 ring-1 ring-cyan-500/30'
                  : 'bg-slate-950/60 hover:bg-slate-900 border-slate-800/90'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="p-1.5 rounded-lg bg-slate-900 border border-slate-800">
                    {SCENARIO_ICONS[desc.id]}
                  </span>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                      isSelected
                        ? 'bg-cyan-500/20 text-cyan-300'
                        : 'bg-slate-900 text-slate-400'
                    }`}
                  >
                    {desc.shortTag}
                  </span>
                </div>
                <h3 className="text-xs font-semibold text-slate-100 mt-2.5">
                  {desc.name}
                </h3>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  {desc.symptomSummary}
                </p>
              </div>
              <div className="pt-2 border-t border-slate-800/60 font-mono text-[10px] text-slate-500 truncate">
                {desc.sampleHex.slice(0, 23)}...
              </div>
            </button>
          );
        })}
      </div>

      {/* Custom Hex Injector Bar when custom_hex is active */}
      {activeScenario === 'custom_hex' && (
        <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-cyan-500/30">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
            <label
              htmlFor="custom-hex-input"
              className="text-xs font-medium text-cyan-300 flex items-center gap-2"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Raw 20-Byte HID++ 2.0 Report Hex Injector</span>
            </label>
            <span className="text-[11px] text-slate-400 font-mono">
              Bytes: [0]=ReportID [2]=Feature [3..4]=mV [5]=Drop% [6]=|RSSI| [7]=Impedance [8]=Flags
            </span>
          </div>
          <div className="flex flex-col sm:flex-row gap-2.5">
            <input
              id="custom-hex-input"
              type="text"
              value={customHexInput}
              onChange={(e) => onCustomHexChange(e.target.value)}
              placeholder="11 FF 18 0D 48 1F 59 26 07 01 F4 25 19 00 00 00 00 00 00 00"
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-xs font-mono text-cyan-200 focus:outline-none focus:border-cyan-400"
            />
            <button
              type="button"
              onClick={handleInject}
              className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition shrink-0 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Parse &amp; Diagnose Hex</span>
            </button>
          </div>
          {hexError && (
            <p className="text-xs text-rose-400 mt-1.5">{hexError}</p>
          )}
        </div>
      )}
    </section>
  );
};
