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
} from 'lucide-react';
import { ScenarioId } from '../types/diagnostics';
import { SCENARIO_DESCRIPTORS } from '../services/simulatorService';

interface DeviceSelectorProps {
  activeScenario: ScenarioId;
  isSimulated: boolean;
  webHidSupported: boolean;
  customHexInput: string;
  connectionError: string | null;
  onSelectScenario: (scenario: ScenarioId) => void;
  onCustomHexChange: (hex: string) => void;
  onInjectCustomHex: () => void;
  onConnectPhysicalDevice: () => void;
  onSwitchToSimulator: () => void;
}

const SCENARIO_ICONS: Record<ScenarioId, React.ReactNode> = {
  rf_interference: <Radio className="w-4 h-4 text-rose-400" />,
  battery_degradation: <BatteryWarning className="w-4 h-4 text-amber-400" />,
  firmware_desync: <Cpu className="w-4 h-4 text-orange-400" />,
  healthy_nominal: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
  custom_hex: <Terminal className="w-4 h-4 text-cyan-400" />,
};

export const DeviceSelector: React.FC<DeviceSelectorProps> = ({
  activeScenario,
  isSimulated,
  webHidSupported,
  customHexInput,
  connectionError,
  onSelectScenario,
  onCustomHexChange,
  onInjectCustomHex,
  onConnectPhysicalDevice,
  onSwitchToSimulator,
}) => {
  const [hexError, setHexError] = useState<string | null>(null);

  const handleInject = () => {
    if (!customHexInput.trim()) {
      setHexError('Please enter at least 1 byte of hexadecimal data.');
      return;
    }
    setHexError(null);
    onInjectCustomHex();
  };

  return (
    <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-xl">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-400">
            Step 1 · Hardware Ingestion Source
          </span>
          <h2 className="text-base font-semibold text-white mt-0.5">
            Select Physical WebHID Connection or Hardware Failure Profile
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onSwitchToSimulator}
            className={`px-3.5 py-2 rounded-xl text-xs font-medium border transition flex items-center gap-2 ${
              isSimulated
                ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-200 shadow-sm shadow-cyan-500/10'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Simulated MX Master 3S (HID++ 2.0)</span>
          </button>

          <button
            type="button"
            onClick={onConnectPhysicalDevice}
            className={`px-3.5 py-2 rounded-xl text-xs font-medium border transition flex items-center gap-2 ${
              !isSimulated
                ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-200'
                : 'bg-slate-950 hover:bg-slate-800 border-slate-700 text-slate-200'
            }`}
          >
            <Usb className="w-3.5 h-3.5 text-cyan-400" />
            <span>
              {webHidSupported
                ? 'Pair Physical USB/BLE Peripheral (WebHID)'
                : 'Pair Physical Peripheral (WebHID Unsupported)'}
            </span>
          </button>
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
        {SCENARIO_DESCRIPTORS.map((desc) => {
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
