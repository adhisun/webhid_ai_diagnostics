import React, { useState } from 'react';
import {
  MessageSquare,
  Send,
  Zap,
  CheckCircle2,
  Code2,
  X,
  Bot,
  User,
  Sparkles,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react';
import {
  ResolutionActionType,
  ScenarioId,
} from '../types/diagnostics';
import { WebHIDDeviceData } from '../types/webhid';
import {
  mapCustomerSymptomToScenario,
  SupportBotPostMessageEvent,
  SupportChatMessage,
} from '../services/supportBotBridge';

interface SupportBotDrawerProps {
  isOpen: boolean;
  deviceCategory?: WebHIDDeviceData['category'];
  latestBridgeEvent: SupportBotPostMessageEvent;
  onToggleOpen: () => void;
  onTriggerScenarioFromBot: (scenario: ScenarioId, customerText: string) => void;
  onExecuteFixFromBot: (actionType: ResolutionActionType) => void;
}

function getSymptomPresets(category?: WebHIDDeviceData['category']): string[] {
  if (category === 'Webcams & ConferenceCams') {
    return [
      'My BRIO 4K video stutters and drops frames on my USB hub',
      'Webcam flickers or resets when 4K HDR power load spikes',
      'Autofocus is hunting and RightLight HDR locked after sleep',
    ];
  }
  if (category === 'Keyboards') {
    return [
      'My keyboard drops keystrokes near my USB 3.0 dock',
      'Keyboard backlight stays on and drains battery rapidly',
      'Media keys and Fn-row layout stuck after waking laptop',
    ];
  }
  if (category === 'Headsets & Audio') {
    return [
      'Audio sounds robotic with dropouts during Teams calls',
      'Headset battery voltage sags when Hybrid ANC is active',
      'Flip-to-mute boom mic state is out of sync with Zoom',
    ];
  }
  return [
    'My mouse cursor keeps stuttering near my USB 3.0 hub',
    'My battery dies suddenly at 30% reported charge',
    'Cursor feels slow (125Hz) after waking laptop from sleep',
  ];
}

export const SupportBotDrawer: React.FC<SupportBotDrawerProps> = ({
  isOpen,
  deviceCategory,
  latestBridgeEvent,
  onToggleOpen,
  onTriggerScenarioFromBot,
  onExecuteFixFromBot,
}) => {
  const symptomPresets = getSymptomPresets(deviceCategory);
  const [inputText, setInputText] = useState('');
  const [showRawBridgeJson, setShowRawBridgeJson] = useState(false);
  const [copiedInjector, setCopiedInjector] = useState(false);
  const [messages, setMessages] = useState<SupportChatMessage[]>(() => [
    {
      id: 'msg-welcome',
      sender: 'bot',
      text: "Hi, I'm Logan! Instead of asking 20 manual troubleshooting questions, I can run an instant On-Device WebHID + Chrome AI hardware scan right in your browser (0 bytes sent to the cloud). Describe your issue or pick a symptom below:",
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);

  const handleCopyInjectorScript = async () => {
    try {
      const res = await fetch('/logi_assistant_injector.js');
      const scriptText = await res.text();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(scriptText);
      }
      setCopiedInjector(true);
      setTimeout(() => setCopiedInjector(false), 3000);
    } catch {
      setCopiedInjector(true);
      setTimeout(() => setCopiedInjector(false), 3000);
    }
  };

  const handleSendSymptom = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const matchedScenario = mapCustomerSymptomToScenario(trimmed);
    const userMsg: SupportChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'customer',
      text: trimmed,
      timestamp: new Date().toLocaleTimeString(),
    };

    const botScanningMsg: SupportChatMessage = {
      id: `bot-${Date.now() + 1}`,
      sender: 'bot',
      text: `Launching local WebHID telemetry scan (${matchedScenario.replace('_', ' ')}) via Chrome On-Device AI...`,
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages((prev) => [...prev, userMsg, botScanningMsg]);
    setInputText('');
    onTriggerScenarioFromBot(matchedScenario, trimmed);
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={onToggleOpen}
        className="fixed bottom-5 right-5 z-40 px-4 py-3 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold shadow-2xl shadow-cyan-500/30 flex items-center gap-2.5 border border-cyan-400/40 cursor-pointer transition"
      >
        <MessageSquare className="w-4 h-4" />
        <span>Test in Support Bot Sandbox</span>
        <span className="px-2 py-0.5 rounded-full bg-slate-950/50 text-[10px] font-mono text-cyan-200">
          Logan Live
        </span>
      </button>
    );
  }

  return (
    <aside className="fixed bottom-4 right-4 z-50 w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col max-h-[86vh] overflow-hidden">
      {/* Bot Header matching Logitech Assistant ("Logan") */}
      <div className="p-3.5 bg-[#232528] border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#c3e703] text-slate-950 font-black text-[11px] tracking-tight flex items-center justify-center shrink-0">
            logi
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-white">
                Logitech Assistant (Logan)
              </h3>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                allow=&quot;hid&quot;
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              CX Support Bot Harness + <code className="font-mono">support.logi.com</code> Injector
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowRawBridgeJson(!showRawBridgeJson)}
            title="Inspect window.postMessage JSON payload"
            className={`px-2 py-1 rounded-lg text-[10px] font-mono border flex items-center gap-1 cursor-pointer ${
              showRawBridgeJson
                ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-200'
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            <Code2 className="w-3 h-3" />
            <span>JSON</span>
          </button>
          <button
            type="button"
            onClick={onToggleOpen}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Live support.logi.com Injection Strip */}
      <div className="px-3.5 py-2.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-2">
        <div className="text-[11px] text-slate-300 leading-tight">
          <span className="font-semibold text-[#c3e703]">Demo on support.logi.com:</span>{' '}
          Copy script &amp; paste in DevTools Console (or load <code className="font-mono text-cyan-300">chrome-extension/</code>)
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleCopyInjectorScript}
            className="px-2.5 py-1.5 rounded-lg bg-[#c3e703] hover:bg-[#d4f527] text-slate-950 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition"
          >
            {copiedInjector ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Copied Script!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Injector Script</span>
              </>
            )}
          </button>
          <a
            href="/logi_assistant_injector.js"
            target="_blank"
            rel="noreferrer"
            title="Open raw logi_assistant_injector.js"
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Chat Conversation Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-900/95">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex items-start gap-2.5 ${
              m.sender === 'customer' ? 'flex-row-reverse' : ''
            }`}
          >
            <div
              className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                m.sender === 'customer'
                  ? 'bg-cyan-600 text-white'
                  : 'bg-[#c3e703] text-slate-950 font-extrabold text-[9px]'
              }`}
            >
              {m.sender === 'customer' ? (
                <User className="w-3.5 h-3.5" />
              ) : (
                <Bot className="w-3.5 h-3.5" />
              )}
            </div>
            <div
              className={`p-3 rounded-xl text-xs leading-relaxed max-w-[82%] ${
                m.sender === 'customer'
                  ? 'bg-cyan-600/25 border border-cyan-500/40 text-cyan-100'
                  : 'bg-slate-950 border border-slate-800 text-slate-200'
              }`}
            >
              <p>{m.text}</p>
              <span className="block text-[9px] text-slate-500 mt-1 font-mono">
                {m.timestamp}
              </span>
            </div>
          </div>
        ))}

        {/* Live Embedded WebHID + Chrome AI Diagnostic Result Card inside Chat */}
        <div className="p-3.5 rounded-xl bg-slate-950 border border-purple-500/40 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-purple-300 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-purple-400" />
              <span>Bot Received On-Device AI Result</span>
            </span>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                latestBridgeEvent.ticketStatus === 'RESOLVED_RMA_DEFLECTED'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              }`}
            >
              {latestBridgeEvent.ticketStatus}
            </span>
          </div>

          <div className="text-xs font-bold text-white">
            {latestBridgeEvent.conditionTitle}
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            {latestBridgeEvent.plainEnglishSummary}
          </p>

          {latestBridgeEvent.ticketStatus === 'RESOLVED_RMA_DEFLECTED' ? (
            <div className="p-2.5 rounded-lg bg-emerald-950/50 border border-emerald-500/40 flex items-center gap-2 text-xs text-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong>Ticket Auto-Resolved!</strong> Hardware verified at 0% packet loss. Unnecessary RMA deflected.
              </span>
            </div>
          ) : (
            <div className="space-y-1.5 pt-1">
              {latestBridgeEvent.recommendedActions.map((act) => (
                <button
                  key={act.id}
                  type="button"
                  onClick={() => onExecuteFixFromBot(act.actionType)}
                  className="w-full py-2 px-3 rounded-lg bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow cursor-pointer transition"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>In-Chat 1-Click Fix: {act.label}</span>
                </button>
              ))}
            </div>
          )}

          {showRawBridgeJson && (
            <div className="pt-2 border-t border-slate-800">
              <div className="text-[10px] font-mono text-cyan-400 mb-1">
                window.postMessage Payload Received by Bot:
              </div>
              <pre className="p-2 rounded bg-slate-900 text-[10px] font-mono text-slate-300 overflow-x-auto max-h-36">
                {JSON.stringify(latestBridgeEvent, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Quick Symptom Chips */}
        <div className="pt-1">
          <div className="text-[10px] font-mono text-slate-400 mb-1.5">
            CLICK A CUSTOMER SYMPTOM TO TEST BOT FLOW:
          </div>
          <div className="flex flex-col gap-1.5">
            {symptomPresets.map((symptom) => (
              <button
                key={symptom}
                type="button"
                onClick={() => handleSendSymptom(symptom)}
                className="text-left text-[11px] px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-cyan-300 transition cursor-pointer"
              >
                &ldquo;{symptom}&rdquo;
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chat Input Footer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendSymptom(inputText);
        }}
        className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type a hardware symptom (e.g. battery drain)..."
          className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
        />
        <button
          type="submit"
          className="px-3 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Ask Bot</span>
        </button>
      </form>
    </aside>
  );
};
