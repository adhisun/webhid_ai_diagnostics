import React from 'react';
import {
  Wrench,
  Zap,
  CheckCircle,
  Terminal,
  ArrowRight,
} from 'lucide-react';
import { RecommendedAction, ResolutionActionType } from '../types/diagnostics';

interface ResolutionPanelProps {
  actions: RecommendedAction[];
  lastExecutionLog: string | null;
  onExecuteAction: (actionType: ResolutionActionType) => void;
}

export const ResolutionPanel: React.FC<ResolutionPanelProps> = ({
  actions,
  lastExecutionLog,
  onExecuteAction,
}) => {
  return (
    <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-800/80">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400">
            Step 4 · One-Click Automated Hardware Resolution
          </span>
          <h2 className="text-base font-semibold text-white mt-0.5 flex items-center gap-2">
            <Wrench className="w-4 h-4 text-emerald-400" />
            <span>Direct WebHID Remediation Commands (Avoids Unnecessary RMA)</span>
          </h2>
        </div>

        <span className="text-xs text-slate-400">
          Executes bidirectional <code className="font-mono text-cyan-300">device.sendReport()</code> directly from browser
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        {actions.map((act) => (
          <div
            key={act.id}
            className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 flex flex-col justify-between gap-3"
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  TX: {act.commandHex}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  ~{act.estimatedFixTimeSec}s execution
                </span>
              </div>
              <h3 className="text-sm font-bold text-white mt-2.5">
                {act.label}
              </h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                {act.description}
              </p>
            </div>

            <button
              type="button"
              onClick={() => onExecuteAction(act.actionType)}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition cursor-pointer"
            >
              <Zap className="w-4 h-4" />
              <span>Execute One-Click Hardware Fix</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {lastExecutionLog && (
        <div className="mt-4 p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs">
            <div className="font-semibold text-emerald-200 flex items-center gap-2">
              <span>Hardware Resolution Command Verified</span>
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <p className="font-mono text-emerald-300/90 mt-1">
              {lastExecutionLog}
            </p>
          </div>
        </div>
      )}
    </section>
  );
};
