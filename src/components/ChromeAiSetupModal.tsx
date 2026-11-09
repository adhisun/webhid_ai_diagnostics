import React from 'react';
import { Sparkles, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { ChromeAiAvailability } from '../services/chromeAiService';

interface ChromeAiSetupModalProps {
  isOpen: boolean;
  aiStatus: ChromeAiAvailability;
  onClose: () => void;
}

export const ChromeAiSetupModal: React.FC<ChromeAiSetupModalProps> = ({
  isOpen,
  aiStatus,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/15 border border-purple-500/30">
              <Sparkles className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Chrome Built-In AI (Gemini Nano) Configuration
              </h2>
              <p className="text-xs text-slate-400">
                On-Device <code className="font-mono">window.ai.languageModel</code> Status &amp; Flags Guide
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="my-4 p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-3">
          {aiStatus === 'ready' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          )}
          <div className="text-xs">
            <div className="font-semibold text-white">
              Current Browser Status:{' '}
              <span className="font-mono uppercase text-cyan-300">{aiStatus}</span>
            </div>
            <p className="text-slate-300 mt-1 leading-relaxed">
              {aiStatus === 'ready'
                ? 'Native Chrome Gemini Nano is active and executing hardware prompts locally.'
                : 'window.ai is not enabled in this browser profile. The prototype is automatically running the Resilient On-Device Heuristic Engine so all features work with zero cloud dependencies.'}
            </p>
          </div>
        </div>

        <div className="space-y-3 text-xs text-slate-300">
          <div className="font-semibold text-white">
            How to Enable Native Gemini Nano in Chrome (Optional):
          </div>
          <ol className="list-decimal list-inside space-y-2 text-slate-300 bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
            <li>
              Open{' '}
              <code className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono">
                chrome://flags/#optimization-guide-on-device-model
              </code>{' '}
              and set to <strong>Enabled BypassPerfRequirement</strong>.
            </li>
            <li>
              Open{' '}
              <code className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono">
                chrome://flags/#prompt-api-for-gemini-nano
              </code>{' '}
              and set to <strong>Enabled</strong>.
            </li>
            <li>
              Relaunch Chrome and check{' '}
              <code className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono">
                chrome://components
              </code>{' '}
              for <strong>Optimization Guide On Device Model</strong>.
            </li>
          </ol>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
