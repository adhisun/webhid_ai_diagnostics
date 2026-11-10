import React from 'react';
import {
  Activity,
  BatteryCharging,
  Radio,
  Gauge,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { TelemetryFrame } from '../types/diagnostics';
import { WebHIDDeviceData } from '../types/webhid';

interface TelemetryViewerProps {
  currentFrame: TelemetryFrame;
  frameHistory: TelemetryFrame[];
  deviceCategory?: WebHIDDeviceData['category'];
  onSampleNextFrame: () => void;
}

export const TelemetryViewer: React.FC<TelemetryViewerProps> = ({
  currentFrame,
  frameHistory,
  deviceCategory = 'Mice & Trackballs',
  onSampleNextFrame,
}) => {
  const { metrics } = currentFrame;
  const isWebcam = deviceCategory === 'Webcams & ConferenceCams';

  const isRfBad = metrics.packetDropRatePct >= 10 || metrics.rssiDbm <= -75;
  const isBattBad =
    metrics.batteryVoltageMv <= 3450 || metrics.internalImpedanceOhms >= 0.3;
  const isFwBad = !metrics.nvramSyncValid || metrics.pollingRateHz < 500;

  const hexTokens = currentFrame.rawHex.split(' ');

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-2 pb-4 border-b border-slate-800/80">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-400">
              Step 2 · Live WebHID Telemetry Stream
            </span>
            <h2 className="text-base font-semibold text-white mt-0.5 flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span>Real-Time Hardware Registers &amp; Hex Inspector</span>
            </h2>
          </div>

          <button
            type="button"
            onClick={onSampleNextFrame}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-200 flex items-center gap-1.5 transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
            <span>Poll HID++ Report</span>
          </button>
        </div>

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          {/* RF Signal / UVC Frame Drop Rate */}
          <div
            className={`p-3.5 rounded-xl border ${
              isRfBad
                ? 'bg-rose-950/30 border-rose-500/40'
                : 'bg-slate-950/70 border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>
                {isWebcam ? 'UVC Stream / Frame Drop' : '2.4GHz RF / Packet Loss'}
              </span>
              <Radio
                className={`w-4 h-4 ${
                  isRfBad ? 'text-rose-400' : 'text-emerald-400'
                }`}
              />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-xl font-bold font-mono text-white">
                {metrics.packetDropRatePct}%{' '}
                <span className="text-xs font-normal text-slate-400">drop</span>
              </span>
              <span
                className={`text-xs font-mono ${
                  isRfBad ? 'text-rose-300' : 'text-emerald-300'
                }`}
              >
                {isWebcam ? 'Isochronous' : `${metrics.rssiDbm} dBm`}
              </span>
            </div>
            <div className="mt-2 text-[11px] text-slate-400">
              {isWebcam ? 'USB Bus Contention:' : 'USB 3.0 Noise Floor:'}{' '}
              <span className="font-mono text-slate-200">
                {metrics.usb3NoiseFloorDb} dB
              </span>
            </div>
          </div>

          {/* Battery Voltage / VBUS Rail */}
          <div
            className={`p-3.5 rounded-xl border ${
              isBattBad
                ? 'bg-amber-950/30 border-amber-500/40'
                : 'bg-slate-950/70 border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>
                {isWebcam ? 'USB VBUS Rail / Cable Ω' : 'Li-Po Cell / Impedance'}
              </span>
              <BatteryCharging
                className={`w-4 h-4 ${
                  isBattBad ? 'text-amber-400' : 'text-emerald-400'
                }`}
              />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-xl font-bold font-mono text-white">
                {metrics.batteryVoltageMv}{' '}
                <span className="text-xs font-normal text-slate-400">mV</span>
              </span>
              <span
                className={`text-xs font-mono ${
                  isBattBad ? 'text-amber-300' : 'text-emerald-300'
                }`}
              >
                {metrics.internalImpedanceOhms} Ω
              </span>
            </div>
            <div className="mt-2 text-[11px] text-slate-400">
              {isWebcam ? 'Regulator Margin:' : 'Estimated SOC:'}{' '}
              <span className="font-mono text-slate-200">
                {metrics.batteryLevelPct}%
              </span>
            </div>
          </div>

          {/* Polling Rate & Firmware */}
          <div
            className={`p-3.5 rounded-xl border ${
              isFwBad
                ? 'bg-orange-950/30 border-orange-500/40'
                : 'bg-slate-950/70 border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Report Rate &amp; NVRAM</span>
              <Gauge
                className={`w-4 h-4 ${
                  isFwBad ? 'text-orange-400' : 'text-cyan-400'
                }`}
              />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-xl font-bold font-mono text-white">
                {metrics.pollingRateHz}{' '}
                <span className="text-xs font-normal text-slate-400">Hz</span>
              </span>
              <span
                className={`text-xs font-mono ${
                  metrics.nvramSyncValid ? 'text-emerald-300' : 'text-orange-300'
                }`}
              >
                {metrics.nvramSyncValid ? 'CRC OK' : 'CRC ERR'}
              </span>
            </div>
            <div className="mt-2 text-[11px] text-slate-400 truncate">
              FW:{' '}
              <span className="font-mono text-slate-200">
                {metrics.firmwareVersion}
              </span>
            </div>
          </div>

          {/* Active Hardware Error Flags */}
          <div className="p-3.5 rounded-xl border bg-slate-950/70 border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>HID++ Fault Flags</span>
              <AlertTriangle
                className={`w-4 h-4 ${
                  metrics.errorFlags.length > 0
                    ? 'text-rose-400'
                    : 'text-slate-600'
                }`}
              />
            </div>
            <div className="mt-2">
              {metrics.errorFlags.length === 0 ? (
                <span className="inline-block text-xs font-mono text-emerald-400 bg-emerald-950/50 border border-emerald-500/30 px-2 py-1 rounded">
                  0x00 (NO_FAULTS)
                </span>
              ) : (
                <div className="flex flex-col gap-1">
                  {metrics.errorFlags.map((flag) => (
                    <span
                      key={flag}
                      className="text-[10px] font-mono text-rose-300 bg-rose-950/60 border border-rose-500/30 px-1.5 py-0.5 rounded truncate"
                    >
                      {flag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Annotated Raw Hex Byte Inspector */}
        <div className="mt-4 p-3.5 rounded-xl bg-slate-950 border border-slate-800/90">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2">
            <span className="font-semibold text-slate-300">
              Raw 20-Byte HID++ Frame (Report ID 0x{currentFrame.reportId.toString(16).toUpperCase()})
            </span>
            <span className="font-mono text-cyan-400">
              Feature {currentFrame.featureId}
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5 font-mono text-xs">
            {hexTokens.map((byteStr, idx) => {
              let colorClass = 'bg-slate-900 text-slate-400 border-slate-800';
              let tooltip = `Byte [${idx}]`;
              if (idx === 0) {
                colorClass = 'bg-purple-950/70 text-purple-300 border-purple-500/40';
                tooltip = 'Report ID (0x11 = Long HID++ Report)';
              } else if (idx === 2) {
                colorClass = 'bg-cyan-950/70 text-cyan-300 border-cyan-500/40';
                tooltip = 'HID++ Feature Index';
              } else if (idx === 3 || idx === 4) {
                colorClass = 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40';
                tooltip = 'Battery Voltage (Big-Endian mV)';
              } else if (idx === 5 || idx === 6) {
                colorClass = 'bg-amber-950/70 text-amber-300 border-amber-500/40';
                tooltip = 'Packet Drop % & RSSI Magnitude';
              } else if (idx === 8) {
                colorClass = 'bg-rose-950/70 text-rose-300 border-rose-500/40';
                tooltip = 'Fault Flag Bitmask';
              }

              return (
                <span
                  key={`${idx}-${byteStr}`}
                  title={tooltip}
                  className={`px-1.5 py-0.5 rounded border text-[11px] ${colorClass}`}
                >
                  {byteStr}
                </span>
              );
            })}
          </div>

          <div className="mt-2.5 flex flex-wrap gap-3 text-[10px] text-slate-400 font-mono">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm bg-purple-400" /> ReportID
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm bg-cyan-400" /> Feature
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm bg-emerald-400" /> Voltage(mV)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm bg-amber-400" /> Drop%/RSSI
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm bg-rose-400" /> ErrorMask
            </span>
          </div>
        </div>
      </div>

      {/* Recent Telemetry History Log */}
      <div className="mt-4 pt-3 border-t border-slate-800/80">
        <div className="text-[11px] font-mono text-slate-400 mb-1.5 flex justify-between">
          <span>RECENT_INGEST_FRAMES ({frameHistory.length})</span>
          <span>100% LOCAL MEMORY</span>
        </div>
        <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
          {frameHistory.slice(0, 4).map((frm) => (
            <div
              key={frm.id}
              className="text-[11px] font-mono flex items-center justify-between bg-slate-950/50 px-2.5 py-1 rounded border border-slate-800/60 text-slate-400"
            >
              <span className="text-slate-500">
                {new Date(frm.timestamp).toLocaleTimeString()}
              </span>
              <span className="text-cyan-300/90 truncate max-w-[210px]">
                {frm.rawHex.slice(0, 29)}
              </span>
              <span>
                {frm.metrics.batteryVoltageMv}mV · {frm.metrics.packetDropRatePct}% drop
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
