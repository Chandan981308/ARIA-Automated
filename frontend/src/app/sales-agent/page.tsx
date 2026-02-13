'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Bot, Phone, PhoneOff, Mic, MicOff, Volume2,
  Globe, RotateCcw, AlertTriangle,
  Shield, Sparkles,
} from 'lucide-react';
import { useVoiceAgent, VoiceMessage, AgentState } from '@/hooks/useVoiceAgent';
import { knowledgeBaseAPI } from '@/lib/api';

// ============================================================================
// Audio Visualizer Component
// ============================================================================

function AudioVisualizer({
  isActive,
  volume,
  agentState,
}: {
  isActive: boolean;
  volume: number;
  agentState: AgentState;
}) {
  const scale = 1 + volume * 0.6;
  const isSpeaking = agentState === 'speaking';
  const isThinking = agentState === 'thinking';

  return (
    <div className="relative flex items-center justify-center" style={{ width: 220, height: 220 }}>
      {/* Outer pulse ring */}
      <div
        className={`absolute rounded-full transition-all duration-300 ${
          isSpeaking
            ? 'bg-green-500/10 border-2 border-green-500/30'
            : isThinking
            ? 'bg-yellow-500/10 border-2 border-yellow-500/30 animate-pulse'
            : isActive
            ? 'bg-orange-500/10 border-2 border-orange-500/30'
            : 'bg-gray-700/30 border-2 border-gray-600/20'
        }`}
        style={{
          width: 220,
          height: 220,
          transform: isActive ? `scale(${scale})` : 'scale(1)',
          transition: 'transform 0.15s ease-out',
        }}
      />
      {/* Middle ring */}
      <div
        className={`absolute rounded-full transition-all duration-200 ${
          isSpeaking
            ? 'bg-green-500/20 border-2 border-green-400/40'
            : isThinking
            ? 'bg-yellow-500/15 border-2 border-yellow-400/30 animate-pulse'
            : isActive
            ? 'bg-orange-500/20 border-2 border-orange-400/40'
            : 'bg-gray-700/20 border-2 border-gray-600/15'
        }`}
        style={{
          width: 160,
          height: 160,
          transform: isActive ? `scale(${1 + volume * 0.4})` : 'scale(1)',
          transition: 'transform 0.1s ease-out',
        }}
      />
      {/* Inner glowing circle with icon */}
      <div
        className={`relative z-10 rounded-full flex items-center justify-center ${
          isSpeaking
            ? 'bg-gradient-to-br from-green-600 to-green-700 shadow-lg shadow-green-500/40'
            : isThinking
            ? 'bg-gradient-to-br from-yellow-600 to-yellow-700 shadow-lg shadow-yellow-500/40'
            : isActive
            ? 'bg-gradient-to-br from-orange-600 to-amber-700 shadow-lg shadow-orange-500/40'
            : 'bg-gray-700 shadow-lg'
        }`}
        style={{ width: 100, height: 100 }}
      >
        {isSpeaking ? (
          <Volume2 className="w-10 h-10 text-white animate-pulse" />
        ) : isThinking ? (
          <Sparkles className="w-10 h-10 text-white animate-spin" style={{ animationDuration: '2s' }} />
        ) : (
          <Mic className={`w-10 h-10 ${isActive ? 'text-white' : 'text-gray-400'}`} />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Transcript Bubble Component
// ============================================================================

function TranscriptBubble({ msg }: { msg: VoiceMessage }) {
  const isUser = msg.role === 'user';
  const time = msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center flex-shrink-0 mt-1">
          <Bot className="w-4 h-4 text-white" />
        </div>
      )}
      <div className={`max-w-[80%] ${isUser ? 'order-first' : ''}`}>
        <div className={`flex items-center gap-2 mb-1 ${isUser ? 'justify-end' : ''}`}>
          <span className={`text-xs font-medium ${isUser ? 'text-blue-400' : 'text-orange-400'}`}>
            {isUser ? 'You' : 'Chitti'}
          </span>
          <span className="text-xs text-gray-500">{time}</span>
        </div>
        <div
          className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
            isUser
              ? 'bg-blue-600 text-white rounded-br-md'
              : 'bg-gray-800 text-gray-200 rounded-bl-md'
          }`}
        >
          {msg.content}
        </div>
      </div>
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mt-1">
          <Mic className="w-4 h-4 text-white" />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Format Duration
// ============================================================================

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// ============================================================================
// Main Page — Voice Only (No Chat/Text Input)
// ============================================================================

export default function SalesAgentPage() {
  const {
    callState,
    agentState,
    isUserSpeaking,
    isMuted,
    liveTranscript,
    messages,
    callDuration,
    error,
    volume,
    startCall,
    endCall,
    toggleMute,
  } = useVoiceAgent();

  const [language] = useState('hinglish');
  const [kbStatus, setKbStatus] = useState<any>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Load KB status
  useEffect(() => {
    knowledgeBaseAPI.getConfig().then((res) => setKbStatus(res.data)).catch(() => {});
  }, []);

  // Auto scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, liveTranscript]);

  const handleStartCall = () => {
    startCall(language);
  };

  const agentName = kbStatus?.agent_name || 'Chitti';
  const companyName = kbStatus?.company_name || 'RSC Group Dholera';
  const isCallActive = callState === 'active';
  const isConnecting = callState === 'connecting';

  const getStatusText = () => {
    if (isConnecting) return 'Connecting...';
    switch (agentState) {
      case 'listening': return isMuted ? 'Muted' : 'Listening...';
      case 'thinking': return `${agentName} is thinking...`;
      case 'speaking': return `${agentName} is speaking...`;
      default: return 'Ready';
    }
  };

  const getStatusColor = () => {
    switch (agentState) {
      case 'listening': return 'text-green-400';
      case 'thinking': return 'text-yellow-400';
      case 'speaking': return 'text-blue-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-600 to-amber-600 flex items-center justify-center">
            <Phone className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Realtime Voice AI Sales Agent</h1>
            <p className="text-sm text-gray-400">Talk like a human — Powered by Knowledge Base</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-400 hover:text-white border border-gray-700 rounded-lg hover:border-gray-600 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Voice + Transcript Panel */}
        <div className="flex-1 flex flex-col">
          {/* Error Banner */}
          {error && (
            <div className="mx-6 mt-4 p-3 bg-red-900/30 border border-red-700/50 rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span className="text-sm text-red-300">{error}</span>
              <button onClick={() => window.location.reload()} className="ml-auto text-xs text-red-400 hover:text-red-300">
                Retry
              </button>
            </div>
          )}

          {!isCallActive && !isConnecting ? (
            /* ---- Welcome State ---- */
            <div className="flex-1 flex flex-col items-center justify-center px-6">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-600 to-amber-600 flex items-center justify-center mb-6 shadow-xl shadow-orange-500/30">
                <Bot className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">Meet {agentName}</h2>
              <p className="text-gray-400 text-center mb-2">Your AI Sales Agent from {companyName}</p>
              <p className="text-gray-500 text-sm text-center max-w-md mb-10">
                Talks like a real human sales person. Bilingual English &amp; Hindi.
                Just click the button and start talking — like a real phone call.
              </p>

              <button
                onClick={handleStartCall}
                className="flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white text-lg font-semibold rounded-2xl shadow-xl shadow-green-500/30 transition-all transform hover:scale-105 active:scale-95"
              >
                <Phone className="w-6 h-6" />
                Start Voice Call
              </button>

              <div className="flex gap-4 mt-12">
                {[
                  { icon: Globe, title: 'Bilingual', desc: 'EN / HI / Hinglish' },
                  { icon: Mic, title: 'Voice Only', desc: 'Talk naturally' },
                  { icon: Shield, title: 'On-Topic Only', desc: 'KB restricted' },
                ].map((f) => (
                  <div key={f.title} className="flex flex-col items-center p-4 bg-gray-800/50 rounded-xl border border-gray-700/50 w-36">
                    <f.icon className="w-5 h-5 text-orange-400 mb-2" />
                    <span className="text-sm font-medium text-white">{f.title}</span>
                    <span className="text-xs text-gray-500 mt-0.5">{f.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* ---- Active Call State — Voice Only ---- */
            <div className="flex-1 flex flex-col">
              {/* Voice Visualizer — Large Center Area */}
              <div className="flex flex-col items-center justify-center py-10 flex-shrink-0">
                <AudioVisualizer
                  isActive={isCallActive && (isUserSpeaking || agentState === 'speaking')}
                  volume={volume}
                  agentState={agentState}
                />

                <p className={`mt-5 text-base font-medium ${getStatusColor()} transition-all`}>
                  {getStatusText()}
                </p>

                {/* Live Transcript Preview — what you're saying right now */}
                {liveTranscript && (
                  <div className="mt-4 px-5 py-2.5 bg-gray-800/60 rounded-xl max-w-lg">
                    <p className="text-xs text-gray-500 mb-0.5">You are saying:</p>
                    <p className="text-sm text-gray-300 italic">&ldquo;{liveTranscript}&rdquo;</p>
                  </div>
                )}

                {/* Call Duration */}
                {isCallActive && (
                  <p className="mt-3 text-sm font-mono text-gray-500">{formatDuration(callDuration)}</p>
                )}

                {/* Control Buttons: Mute + End Call */}
                <div className="flex items-center gap-6 mt-8">
                  <button
                    onClick={toggleMute}
                    className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                      isMuted
                        ? 'bg-red-600/20 border-2 border-red-500 text-red-400'
                        : 'bg-gray-700/50 border-2 border-gray-600 text-gray-300 hover:border-gray-500'
                    }`}
                    title={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                  </button>

                  <button
                    onClick={endCall}
                    className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center transition-all shadow-xl shadow-red-500/30 active:scale-95"
                    title="End call"
                  >
                    <PhoneOff className="w-7 h-7 text-white" />
                  </button>
                </div>
              </div>

              {/* Transcript Panel — Shows conversation history (read-only) */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 border-t border-gray-800">
                {messages.length === 0 && !liveTranscript && (
                  <div className="text-center text-gray-500 text-sm py-6">
                    {isConnecting ? 'Setting up the call...' : 'Start speaking — your conversation will appear here'}
                  </div>
                )}

                {messages.map((msg) => (
                  <TranscriptBubble key={msg.id} msg={msg} />
                ))}

                {liveTranscript && (
                  <div className="flex gap-3 justify-end">
                    <div className="max-w-[80%]">
                      <div className="px-4 py-2.5 rounded-2xl rounded-br-md bg-blue-600/30 border border-blue-500/30 text-blue-200 text-sm italic">
                        {liveTranscript}...
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-blue-600/50 flex items-center justify-center flex-shrink-0 mt-1">
                      <Mic className="w-4 h-4 text-blue-300 animate-pulse" />
                    </div>
                  </div>
                )}

                {agentState === 'thinking' && (
                  <div className="flex gap-3 justify-start">
                    <div className="w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center flex-shrink-0 mt-1">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-gray-800">
                      <div className="flex gap-1.5">
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={transcriptEndRef} />
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="w-72 border-l border-gray-800 p-4 space-y-4 overflow-y-auto hidden lg:block">
          {/* Agent Card */}
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-600 to-amber-600 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">{agentName}</h3>
                <p className="text-xs text-gray-400">{companyName}</p>
              </div>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Status</span>
                <span className={`font-medium ${isCallActive ? 'text-green-400' : 'text-gray-300'}`}>
                  {isCallActive ? 'On Call' : 'Ready'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Mode</span>
                <span className="text-orange-400 font-medium">Voice</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Language</span>
                <span className="text-gray-300">Hinglish</span>
              </div>
              {isCallActive && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Duration</span>
                  <span className="text-gray-300 font-mono">{formatDuration(callDuration)}</span>
                </div>
              )}
            </div>
          </div>

          {isCallActive && (
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Conversation</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Mic className="w-4 h-4 text-blue-400" />
                  <span className="text-sm text-gray-300">{messages.filter((m) => m.role === 'user').length}</span>
                  <span className="text-xs text-gray-500">Your messages</span>
                </div>
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-orange-400" />
                  <span className="text-sm text-gray-300">{messages.filter((m) => m.role === 'assistant').length}</span>
                  <span className="text-xs text-gray-500">Agent replies</span>
                </div>
              </div>
            </div>
          )}

          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Knowledge Base</h4>
            <div className="space-y-2">
              {[
                { label: 'FAQs loaded', active: (kbStatus?.faqs?.length || 0) > 0 },
                { label: 'Objection handling', active: (kbStatus?.objection_handling?.length || 0) > 0 },
                { label: 'Bilingual support', active: true },
                { label: 'Off-topic guard', active: true },
                { label: 'Voice TTS active', active: true },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${item.active ? 'bg-green-400' : 'bg-yellow-400'}`} />
                  <span className="text-xs text-gray-400">{item.label}</span>
                </div>
              ))}
            </div>
            <a href="/knowledge-base" className="block mt-3 text-xs text-orange-400 hover:text-orange-300 transition-colors">
              Manage Knowledge Base &rarr;
            </a>
          </div>

          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Try Saying</h4>
            <div className="space-y-2">
              {[
                '"Tell me about Dholera"',
                '"Price kya hai?"',
                '"Site visit schedule karo"',
                '"Is it safe to invest?"',
                '"Plot sizes available?"',
              ].map((phrase) => (
                <p key={phrase} className="text-xs text-gray-500 py-1 cursor-default">{phrase}</p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
