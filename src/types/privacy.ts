/**
 * Zero-Leak Privacy & Security Audit Types
 */

export interface PrivacyAuditEntry {
  id: string;
  timestamp: string;
  operation: 'WEBHID_INGEST' | 'LOCAL_AI_PROMPT' | 'HID_RESOLUTION_CMD';
  payloadBytesProcessedLocally: number;
  externalNetworkBytesSent: number;
  telemetryDigestSha256: string;
  destination: 'LOCAL_BROWSER_SANDBOX_ONLY';
}

export interface ZeroLeakComplianceReport {
  reportId: string;
  generatedAt: string;
  deviceEvaluated: string;
  totalLocalFramesAnalyzed: number;
  totalLocalAiInferences: number;
  totalExternalBytesTransmitted: number;
  blockedOrExternalRequestsDetected: number;
  gdprCcpaCompliant: boolean;
  corporateFirewallSafe: boolean;
  auditEntries: PrivacyAuditEntry[];
}
