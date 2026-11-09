import React from 'react';
import {
  ShieldCheck,
  X,
  Download,
  Lock,
  ServerOff,
} from 'lucide-react';
import { ZeroLeakComplianceReport } from '../types/privacy';

interface ZeroLeakAuditModalProps {
  isOpen: boolean;
  report: ZeroLeakComplianceReport;
  onClose: () => void;
}

export const ZeroLeakAuditModal: React.FC<ZeroLeakAuditModalProps> = ({
  isOpen,
  report,
  onClose,
}) => {
  if (!isOpen) return null;

  const handleExportReport = () => {
    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.reportId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Zero-Leak Security &amp; Compliance Audit
              </h2>
              <p className="text-xs text-slate-400">
                GDPR / CCPA / Corporate Air-Gap Verification Log
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

        <div className="grid grid-cols-3 gap-3 my-4">
          <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30">
            <div className="text-xs text-emerald-300 flex items-center gap-1.5">
              <ServerOff className="w-3.5 h-3.5" />
              <span>External Egress</span>
            </div>
            <div className="text-2xl font-bold font-mono text-white mt-1">
              {report.totalExternalBytesTransmitted} Bytes
            </div>
            <div className="text-[11px] text-emerald-400 mt-0.5">
              Zero Cloud Transmission
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-cyan-400" />
              <span>Frames Audited</span>
            </div>
            <div className="text-2xl font-bold font-mono text-white mt-1">
              {report.totalLocalFramesAnalyzed}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Processed in Local Sandbox
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-xs text-slate-400">Local AI Runs</div>
            <div className="text-2xl font-bold font-mono text-white mt-1">
              {report.totalLocalAiInferences}
            </div>
            <div className="text-[11px] text-emerald-400 mt-0.5">
              GDPR/CCPA Compliant
            </div>
          </div>
        </div>

        <div className="text-xs font-mono text-slate-400 mb-2">
          LOCAL_SANDBOX_CRYPTO_LEDGER ({report.auditEntries.length} entries)
        </div>
        <div className="max-h-56 overflow-y-auto space-y-1.5 bg-slate-950 p-3 rounded-xl border border-slate-800">
          {report.auditEntries.map((entry) => (
            <div
              key={entry.id}
              className="text-[11px] font-mono flex flex-wrap items-center justify-between gap-2 py-1.5 px-2.5 rounded bg-slate-900/80 border border-slate-800/70"
            >
              <span className="text-cyan-300 font-semibold">
                {entry.operation}
              </span>
              <span className="text-slate-400">
                {entry.payloadBytesProcessedLocally}B local /{' '}
                <strong className="text-emerald-400">
                  {entry.externalNetworkBytesSent}B external
                </strong>
              </span>
              <span className="text-slate-500 text-[10px]">
                {entry.telemetryDigestSha256}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Report ID: <code className="font-mono text-slate-200">{report.reportId}</code>
          </span>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleExportReport}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export JSON Compliance Certificate</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
