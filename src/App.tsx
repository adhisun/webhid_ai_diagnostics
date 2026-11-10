import React, { useEffect, useState, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { DeviceSelector } from './components/DeviceSelector';
import { TelemetryViewer } from './components/TelemetryViewer';
import { AiDiagnosticCard } from './components/AiDiagnosticCard';
import { ResolutionPanel } from './components/ResolutionPanel';
import { ZeroLeakAuditModal } from './components/ZeroLeakAuditModal';
import { ChromeAiSetupModal } from './components/ChromeAiSetupModal';
import { SupportBotDrawer } from './components/SupportBotDrawer';
import {
  DiagnosticResult,
  ResolutionActionType,
  ScenarioId,
  TelemetryFrame,
} from './types/diagnostics';
import { NativeHIDDevice, WebHIDDeviceData } from './types/webhid';
import {
  applyResolutionAction,
  generateSimulatedFrame,
  getSimulatedDeviceMetadata,
} from './services/simulatorService';
import {
  getAuthorizedPhysicalWebHIDDevices,
  hexToUint8Array,
  isWebHIDSupported,
  parseCustomHexStringToFrame,
  parseHidReportToFrame,
  requestPhysicalWebHIDDevice,
} from './services/webhidService';
import {
  analyzeTelemetryWithLocalAi,
  checkChromeAiAvailability,
  ChromeAiAvailability,
  runLocalHeuristicDiagnosis,
} from './services/chromeAiService';
import { privacyAuditSentry } from './services/privacyAuditService';
import {
  buildSupportBotPayload,
  emitSupportBotPostMessage,
  SupportBotPostMessageEvent,
} from './services/supportBotBridge';

export const App: React.FC = () => {
  const [device, setDevice] = useState<WebHIDDeviceData>(() =>
    getSimulatedDeviceMetadata('mx-master-3s')
  );
  const [pairedPhysicalMap, setPairedPhysicalMap] = useState<
    Array<{ deviceData: WebHIDDeviceData; nativeDevice: NativeHIDDevice }>
  >([]);
  const [nativeDevice, setNativeDevice] = useState<NativeHIDDevice | null>(null);
  const [activeScenario, setActiveScenario] =
    useState<ScenarioId>('rf_interference');
  const [tick, setTick] = useState<number>(0);

  const [currentFrame, setCurrentFrame] = useState<TelemetryFrame>(() => {
    const initial = generateSimulatedFrame('rf_interference', 0, 'mx-master-3s');
    privacyAuditSentry.recordLocalOperation('WEBHID_INGEST', initial.rawHex);
    return initial;
  });

  const [frameHistory, setFrameHistory] = useState<TelemetryFrame[]>(() => [
    currentFrame,
  ]);

  const [diagnosis, setDiagnosis] = useState<DiagnosticResult>(() => {
    const initialDiag = runLocalHeuristicDiagnosis(
      currentFrame,
      currentFrame.rawHex,
      14
    );
    privacyAuditSentry.recordLocalOperation(
      'LOCAL_AI_PROMPT',
      initialDiag.conditionTitle
    );
    return initialDiag;
  });

  const [latestBridgeEvent, setLatestBridgeEvent] =
    useState<SupportBotPostMessageEvent>(() =>
      buildSupportBotPayload(
        diagnosis,
        null,
        `CX-ZERO-LEAK-INIT`,
        privacyAuditSentry.computeDigest(currentFrame.rawHex)
      )
    );

  const [isSupportBotOpen, setIsSupportBotOpen] = useState<boolean>(true);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [aiStatus, setAiStatus] = useState<ChromeAiAvailability>('unavailable');
  const [customHexInput, setCustomHexInput] = useState<string>(
    '11 FF 18 0D 48 1F 59 26 07 01 F4 25 19 00 00 00 00 00 00 00'
  );
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [lastExecutionLog, setLastExecutionLog] = useState<string | null>(null);

  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState<boolean>(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState<boolean>(false);
  const [auditCount, setAuditCount] = useState<number>(
    () => privacyAuditSentry.getEntries().length
  );

  const webHidSupported = isWebHIDSupported();

  const runDiagnosisOnFrame = useCallback(
    async (
      frame: TelemetryFrame,
      remediationApplied: ResolutionActionType | null = null,
      targetDeviceName?: string,
      targetDeviceCategory?: WebHIDDeviceData['category']
    ) => {
      setIsAnalyzing(true);
      const effectiveName = targetDeviceName || device.productName;
      const effectiveCategory = targetDeviceCategory || device.category;
      try {
        const result = await analyzeTelemetryWithLocalAi(
          frame,
          effectiveCategory,
          effectiveName
        );
        const auditEntry = privacyAuditSentry.recordLocalOperation(
          'LOCAL_AI_PROMPT',
          JSON.stringify({
            device: effectiveName,
            category: effectiveCategory,
            frameId: frame.id,
            condition: result.conditionTitle,
            engine: result.engineUsed,
          })
        );
        setDiagnosis(result);
        setAuditCount(privacyAuditSentry.getEntries().length);

        const report = privacyAuditSentry.generateComplianceReport(
          effectiveName
        );
        const bridgePayload = emitSupportBotPostMessage(
          result,
          remediationApplied,
          report.reportId,
          auditEntry.telemetryDigestSha256
        );
        setLatestBridgeEvent(bridgePayload);
      } finally {
        setIsAnalyzing(false);
      }
    },
    [device.productName, device.category]
  );

  useEffect(() => {
    checkChromeAiAvailability().then(setAiStatus);
    getAuthorizedPhysicalWebHIDDevices().then((list) => {
      if (list.length > 0) {
        setPairedPhysicalMap(list);
      }
    });
  }, []);

  const ingestNewFrame = useCallback(
    (
      frame: TelemetryFrame,
      remediationApplied: ResolutionActionType | null = null,
      targetDeviceName?: string,
      targetDeviceCategory?: WebHIDDeviceData['category']
    ) => {
      privacyAuditSentry.recordLocalOperation('WEBHID_INGEST', frame.rawHex);
      setCurrentFrame(frame);
      setFrameHistory((prev) => [frame, ...prev.slice(0, 19)]);
      setAuditCount(privacyAuditSentry.getEntries().length);
      runDiagnosisOnFrame(
        frame,
        remediationApplied,
        targetDeviceName,
        targetDeviceCategory
      );
    },
    [runDiagnosisOnFrame]
  );

  const handleSelectCatalogDevice = (catalogId: string) => {
    if (nativeDevice && nativeDevice.opened) {
      nativeDevice.close().catch(() => {});
    }
    setNativeDevice(null);
    const meta = getSimulatedDeviceMetadata(catalogId);
    setDevice(meta);
    setConnectionError(null);
    setLastExecutionLog(null);

    const nextTick = tick + 1;
    setTick(nextTick);
    const nextScenario =
      activeScenario === 'custom_hex' ? 'rf_interference' : activeScenario;
    const nextFrame = generateSimulatedFrame(nextScenario, nextTick, catalogId);
    ingestNewFrame(nextFrame, null, meta.productName, meta.category);
  };

  const handleSelectPhysicalDevice = async (deviceId: string) => {
    const match = pairedPhysicalMap.find((p) => p.deviceData.id === deviceId);
    if (!match) return;

    try {
      if (!match.nativeDevice.opened) {
        await match.nativeDevice.open();
      }
      setDevice(match.deviceData);
      setNativeDevice(match.nativeDevice);
      setConnectionError(null);
      setLastExecutionLog(null);

      const nextTick = tick + 1;
      setTick(nextTick);
      const nextFrame = generateSimulatedFrame(
        activeScenario,
        nextTick,
        match.deviceData.id,
        match.deviceData.productName,
        match.deviceData.productId
      );
      ingestNewFrame(
        nextFrame,
        null,
        match.deviceData.productName,
        match.deviceData.category
      );
    } catch (err) {
      setConnectionError(
        err instanceof Error ? err.message : 'Unable to open physical HID device.'
      );
    }
  };

  const handleSelectScenario = (scenario: ScenarioId) => {
    setActiveScenario(scenario);
    setLastExecutionLog(null);
    setConnectionError(null);

    if (scenario === 'custom_hex') {
      try {
        const customFrame = parseCustomHexStringToFrame(customHexInput);
        ingestNewFrame(customFrame, null, device.productName, device.category);
      } catch (err) {
        setConnectionError(
          err instanceof Error ? err.message : 'Invalid custom hex input'
        );
      }
      return;
    }

    const nextTick = tick + 1;
    setTick(nextTick);
    const nextFrame = generateSimulatedFrame(
      scenario,
      nextTick,
      device.id,
      device.productName,
      device.productId
    );
    ingestNewFrame(nextFrame, null, device.productName, device.category);
  };

  const handleSampleNextFrame = () => {
    if (activeScenario === 'custom_hex') {
      handleInjectCustomHex();
      return;
    }
    const nextTick = tick + 1;
    setTick(nextTick);
    const nextFrame = generateSimulatedFrame(
      activeScenario,
      nextTick,
      device.id,
      device.productName,
      device.productId
    );
    ingestNewFrame(nextFrame, null, device.productName, device.category);
  };

  const handleInjectCustomHex = () => {
    try {
      setConnectionError(null);
      setLastExecutionLog(null);
      const customFrame = parseCustomHexStringToFrame(customHexInput);
      ingestNewFrame(customFrame, null, device.productName, device.category);
    } catch (err) {
      setConnectionError(
        err instanceof Error ? err.message : 'Failed to parse custom hex report.'
      );
    }
  };

  const handleConnectPhysicalDevice = async () => {
    setConnectionError(null);
    try {
      const connected = await requestPhysicalWebHIDDevice(false);
      if (!connected) {
        setConnectionError(
          'No physical peripheral was selected in the browser chooser. Use the dropdown to select any Logitech device model.'
        );
        return;
      }

      setPairedPhysicalMap((prev) => [
        connected,
        ...prev.filter(
          (p) => p.deviceData.productId !== connected.deviceData.productId
        ),
      ]);
      setDevice(connected.deviceData);
      setNativeDevice(connected.nativeDevice);

      const initialFrame = generateSimulatedFrame(
        activeScenario,
        tick + 1,
        connected.deviceData.id,
        connected.deviceData.productName,
        connected.deviceData.productId
      );
      ingestNewFrame(
        initialFrame,
        null,
        connected.deviceData.productName,
        connected.deviceData.category
      );

      connected.nativeDevice.addEventListener('inputreport', (event) => {
        const parsed = parseHidReportToFrame(
          event.reportId,
          event.data,
          activeScenario
        );
        ingestNewFrame(
          parsed,
          null,
          connected.deviceData.productName,
          connected.deviceData.category
        );
      });
    } catch (err) {
      setConnectionError(
        err instanceof Error
          ? `${err.message} — Select any Logitech model from the device dropdown.`
          : 'Unable to open WebHID device.'
      );
    }
  };

  const handleExecuteResolution = async (actionType: ResolutionActionType) => {
    const { updatedFrame, executionLog } = applyResolutionAction(
      currentFrame,
      actionType,
      device.id,
      device.category
    );

    if (nativeDevice && nativeDevice.opened) {
      try {
        const cmdBytes = hexToUint8Array('FF 18 0A 4C 00 00');
        await nativeDevice.sendReport(0x11, cmdBytes.buffer as ArrayBuffer);
      } catch {
        // Non-HID++ generic devices may ignore vendor report 0x11
      }
    }

    privacyAuditSentry.recordLocalOperation('HID_RESOLUTION_CMD', executionLog);
    setLastExecutionLog(executionLog);
    ingestNewFrame(updatedFrame, actionType);
  };

  const complianceReport = privacyAuditSentry.generateComplianceReport(
    device.productName
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar
        device={device}
        aiStatus={aiStatus}
        webHidSupported={webHidSupported}
        localEventsCount={auditCount}
        isSupportBotOpen={isSupportBotOpen}
        onOpenPrivacyModal={() => setIsPrivacyModalOpen(true)}
        onOpenAiSetupModal={() => setIsAiModalOpen(true)}
        onToggleSupportBot={() => setIsSupportBotOpen(!isSupportBotOpen)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        <DeviceSelector
          activeDevice={device}
          pairedPhysicalDevices={pairedPhysicalMap.map((p) => p.deviceData)}
          activeScenario={activeScenario}
          webHidSupported={webHidSupported}
          customHexInput={customHexInput}
          connectionError={connectionError}
          onSelectCatalogDevice={handleSelectCatalogDevice}
          onSelectPhysicalDevice={handleSelectPhysicalDevice}
          onSelectScenario={handleSelectScenario}
          onCustomHexChange={setCustomHexInput}
          onInjectCustomHex={handleInjectCustomHex}
          onConnectPhysicalDevice={handleConnectPhysicalDevice}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TelemetryViewer
            currentFrame={currentFrame}
            frameHistory={frameHistory}
            deviceCategory={device.category}
            onSampleNextFrame={handleSampleNextFrame}
          />

          <AiDiagnosticCard
            diagnosis={diagnosis}
            isAnalyzing={isAnalyzing}
            onReanalyze={() => runDiagnosisOnFrame(currentFrame, null)}
          />
        </div>

        <ResolutionPanel
          actions={diagnosis.recommendedActions}
          lastExecutionLog={lastExecutionLog}
          onExecuteAction={handleExecuteResolution}
        />
      </main>

      <footer className="border-t border-slate-900 py-4 px-6 text-center text-xs text-slate-500">
        Zero-Friction Hardware Diagnostics Prototype · 100% On-Device WebHID +
        Chrome Prompt API · Zero Cloud Telemetry Egress
      </footer>

      <SupportBotDrawer
        isOpen={isSupportBotOpen}
        deviceCategory={device.category}
        latestBridgeEvent={latestBridgeEvent}
        onToggleOpen={() => setIsSupportBotOpen(!isSupportBotOpen)}
        onTriggerScenarioFromBot={(scenario) => handleSelectScenario(scenario)}
        onExecuteFixFromBot={(actionType) => handleExecuteResolution(actionType)}
      />

      <ZeroLeakAuditModal
        isOpen={isPrivacyModalOpen}
        report={complianceReport}
        onClose={() => setIsPrivacyModalOpen(false)}
      />

      <ChromeAiSetupModal
        isOpen={isAiModalOpen}
        aiStatus={aiStatus}
        onClose={() => setIsAiModalOpen(false)}
      />
    </div>
  );
};

export default App;
