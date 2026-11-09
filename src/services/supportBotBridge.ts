import {
  DiagnosticResult,
  DiagnosticSeverity,
  RecommendedAction,
  ResolutionActionType,
  ScenarioId,
} from '../types/diagnostics';

export type SupportTicketOutcome =
  | 'RESOLVED_RMA_DEFLECTED'
  | 'DIAGNOSED_AWAITING_FIX'
  | 'ESCALATE_PREAPPROVED_RMA';

export interface SupportBotPostMessageEvent {
  type: 'CX_HARDWARE_DIAGNOSIS_RESULT';
  timestamp: string;
  ticketStatus: SupportTicketOutcome;
  severity: DiagnosticSeverity;
  conditionTitle: string;
  plainEnglishSummary: string;
  recommendedActions: RecommendedAction[];
  remediationApplied: ResolutionActionType | null;
  complianceReportId: string;
  telemetryDigestSha256: string;
  externalBytesSent: 0;
}

export interface SupportChatMessage {
  id: string;
  sender: 'customer' | 'bot' | 'system-bridge';
  text: string;
  timestamp: string;
  bridgePayload?: SupportBotPostMessageEvent;
}

export function mapCustomerSymptomToScenario(input: string): ScenarioId {
  const lower = input.toLowerCase();
  if (
    lower.includes('batt') ||
    lower.includes('drain') ||
    lower.includes('charge') ||
    lower.includes('die') ||
    lower.includes('power') ||
    lower.includes('volt')
  ) {
    return 'battery_degradation';
  }
  if (
    lower.includes('sleep') ||
    lower.includes('wake') ||
    lower.includes('firmware') ||
    lower.includes('poll') ||
    lower.includes('125') ||
    lower.includes('nvram')
  ) {
    return 'firmware_desync';
  }
  if (lower.includes('healthy') || lower.includes('optimal') || lower.includes('good')) {
    return 'healthy_nominal';
  }
  return 'rf_interference';
}

export function buildSupportBotPayload(
  diagnosis: DiagnosticResult,
  remediationApplied: ResolutionActionType | null,
  complianceReportId: string,
  telemetryDigestSha256: string
): SupportBotPostMessageEvent {
  let ticketStatus: SupportTicketOutcome = 'DIAGNOSED_AWAITING_FIX';
  if (remediationApplied || diagnosis.severity === 'optimal') {
    ticketStatus = 'RESOLVED_RMA_DEFLECTED';
  }

  return {
    type: 'CX_HARDWARE_DIAGNOSIS_RESULT',
    timestamp: new Date().toISOString(),
    ticketStatus,
    severity: diagnosis.severity,
    conditionTitle: diagnosis.conditionTitle,
    plainEnglishSummary: diagnosis.plainEnglishSummary,
    recommendedActions: diagnosis.recommendedActions,
    remediationApplied,
    complianceReportId,
    telemetryDigestSha256,
    externalBytesSent: 0,
  };
}

export function emitSupportBotPostMessage(
  diagnosis: DiagnosticResult,
  remediationApplied: ResolutionActionType | null,
  complianceReportId: string,
  telemetryDigestSha256: string
): SupportBotPostMessageEvent {
  const payload = buildSupportBotPayload(
    diagnosis,
    remediationApplied,
    complianceReportId,
    telemetryDigestSha256
  );

  if (typeof window !== 'undefined') {
    window.postMessage(payload, '*');
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(payload, '*');
    }
  }

  return payload;
}
