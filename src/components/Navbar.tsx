import React from 'react';
import {
  Cpu,
  ShieldCheck,
  Usb,
  Sparkles,
  BookOpen,
  MessageSquare,
} from 'lucide-react';
import { ChromeAiAvailability } from '../services/chromeAiService';
import { WebHIDDeviceData } from '../types/webhid';

interface NavbarProps {
  device: WebHIDDeviceData;
  aiStatus: ChromeAiAvailability;
  webHidSupported: boolean;
  localEventsCount: number;
  isSupportBotOpen: boolean;
  onOpenPrivacyModal: () => void;
  onOpenAiSetupModal: () => void;
  onToggleSupportBot: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  device,
  aiStatus,
  webHidSupported,
  localEventsCount,
  isSupportBotOpen,
  onOpenPrivacyModal,
  onOpenAiSetupModal,
  onToggleSupportBot,
}) => {
  return (
    <header className="border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Cpu className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-white">
                Zero-Friction Hardware Diagnostics
              </h1>
              <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                WebHID + Chrome AI
              </span>
            </div>
            <p className="text-xs text-slate-400">
              On-Device Peripheral Telemetry &amp; Local Gemini Nano Root-Cause Engine
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* WebHID Status Pill */}
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs"
            title={
              webHidSupported
                ? 'Browser supports navigator.hid WebHID API'
                : 'Browser lacks navigator.hid; running in Hardware Simulator mode'
            }
          >
            <Usb className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-300 font-medium truncate max-w-[220px]">
              {device.productName}
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>

          {/* Chrome AI Status Pill */}
          <button
            type="button"
            onClick={onOpenAiSetupModal}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800/90 border border-slate-800 transition text-xs cursor-pointer"
          >
            <Sparkles
              className={`w-3.5 h-3.5 ${
                aiStatus === 'ready' ? 'text-purple-400' : 'text-amber-400'
              }`}
            />
            <span className="text-slate-300">
              {aiStatus === 'ready'
                ? 'Gemini Nano: Active'
                : 'Local AI: Heuristic Fallback'}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
              Configure
            </span>
          </button>

          {/* Zero-Leak Privacy Sentry Pill */}
          <button
            type="button"
            onClick={onOpenPrivacyModal}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-950/50 hover:bg-emerald-900/50 border border-emerald-500/40 text-emerald-300 transition text-xs font-medium cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Zero-Leak: 0 B Egress</span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-200 font-mono text-[10px]">
              {localEventsCount} audited
            </span>
          </button>

          {/* Support Bot Test Harness Button */}
          <button
            type="button"
            onClick={onToggleSupportBot}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition cursor-pointer ${
              isSupportBotOpen
                ? 'bg-cyan-500/20 border-cyan-400/60 text-cyan-200'
                : 'bg-slate-900 hover:bg-slate-800 border-cyan-500/40 text-cyan-300'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
            <span>Support Bot Sandbox</span>
          </button>

          {/* Link to Engaging Architecture Guide */}
          <a
            href="/project_explained.html"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs transition"
          >
            <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
            <span>Architecture Guide</span>
          </a>
        </div>
      </div>
    </header>
  );
};
