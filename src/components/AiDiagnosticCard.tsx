import React, { useState } from 'react';
import {
  Sparkles,
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Shield,
} from 'lucide-react';
import { DiagnosticResult } from '../types/diagnostics';

interface AiDiagnosticCardProps {
  diagnosis: DiagnosticResult;
  isAnalyzing: boolean;
  onReanalyze: () => void;
}

export const AiDiagnosticCard: React.FC<AiDiagnosticCardProps> = ({
  diagnosis,
  isAnalyzing,
  onReanalyze,
}) => {
  const [showTechDetails, setShowTechDetails] = useState(true);
  const [showPrompt, setShowPrompt] = useState(false);

  const severityStyles = {
    critical: {
      badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      border: 'border-rose-500/40 bg-rose-950/15',
      icon: <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0" />,
      label: 'CRITICAL HARDWARE ANOMALY',
    },
    warning: {
      badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      border: 'border-amber-500/40 bg-amber-950/15',
      icon: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
      label: 'DEGRADED PERFORMANCE WARNING',
    },
    optimal: {
      badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      border: 'border-emerald-500/40 bg-emerald-950/15',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
      label: 'OPTIMAL HARDWARE STATE',
    },
  }[diagnosis.severity];

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-800/80">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-purple-400">
              Step 3 · On-Device Chrome AI Diagnosis
            </span>
            <h2 className="text-base font-semibold text-white mt-0.5 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>Local Root-Cause Translation</span>
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-cyan-400" />
              {diagnosis.inferenceLatencyMs}ms local
            </span>
            <button
              type="button"
              onClick={onReanalyze}
              disabled={isAnalyzing}
              className="px-3 py-1.5 rounded-lg bg-purple-600/25 hover:bg-purple-600/40 border border-purple-500/40 text-purple-200 text-xs font-medium transition cursor-pointer disabled:opacity-50"
            >
              {isAnalyzing ? 'Analyzing...' : 'Re-Run Local AI'}
            </button>
          </div>
        </div>

        {/* Main Condition Banner */}
        <div className={`mt-4 p-4 rounded-xl border ${severityStyles.border}`}>
          <div className="flex items-center justify-between gap-2 mb-2">
            <span
              className={`text-[10px] font-mono font-semibold px-2.5 py-0.5 rounded-full border ${severityStyles.badge}`}
            >
              {severityStyles.label}
            </span>
            <span className="text-xs font-mono text-slate-300">
              Confidence: <strong className="text-white">{diagnosis.confidence}%</strong>
            </span>
          </div>

          <div className="flex items-start gap-3 mt-2">
            {severityStyles.icon}
            <div>
              <h3 className="text-base font-bold text-white">
                {diagnosis.conditionTitle}
              </h3>
              <p className="text-xs sm:text-sm text-slate-200 mt-1.5 leading-relaxed">
                {diagnosis.plainEnglishSummary}
              </p>
            </div>
          </div>
        </div>

        {/* Technical Root Cause Summary */}
        <div className="mt-3 p-3.5 rounded-xl bg-slate-950/90 border border-slate-800">
          <div className="text-[11px] font-mono uppercase text-slate-400">
            Diagnosed Engineering Root Cause
          </div>
          <p className="text-xs font-mono text-cyan-300 mt-1">
            {diagnosis.rootCause}
          </p>
        </div>

        {/* Expandable L2/L3 Telemetry Breakdown */}
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setShowTechDetails(!showTechDetails)}
            className="w-full flex items-center justify-between text-xs font-medium text-slate-300 hover:text-white py-2 px-3 rounded-lg bg-slate-950/60 border border-slate-800/80 cursor-pointer"
          >
            <span>Level-2/3 Hardware Telemetry Evidence ({diagnosis.technicalDetails.length})</span>
            {showTechDetails ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {showTechDetails && (
            <ul className="mt-2 space-y-1.5 pl-1">
              {diagnosis.technicalDetails.map((item, i) => (
                <li
                  key={i}
                  className="text-xs text-slate-300 bg-slate-950/50 border border-slate-800/60 rounded-lg px-3 py-2 font-mono"
                >
                  • {item}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Footer: Engine Used + Prompt Inspector toggle */}
      <div className="mt-4 pt-3 border-t border-slate-800/80">
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              Engine:{' '}
              <strong className="text-slate-200 font-mono">
                {diagnosis.engineUsed === 'chrome-gemini-nano'
                  ? 'window.ai.languageModel (Gemini Nano)'
                  : 'On-Device Heuristic Engine (Zero-Cloud)'}
              </strong>
            </span>
          </span>

          <button
            type="button"
            onClick={() => setShowPrompt(!showPrompt)}
            className="text-cyan-400 hover:underline font-mono cursor-pointer"
          >
            {showPrompt ? 'Hide Prompt' : 'Inspect AI Prompt'}
          </button>
        </div>

        {showPrompt && (
          <pre className="mt-2 p-3 rounded-lg bg-slate-950 border border-slate-800 text-[10px] font-mono text-slate-300 overflow-x-auto max-h-36">
            {diagnosis.rawPromptPreview}
          </pre>
        )}
      </div>
    </div>
  );
};
