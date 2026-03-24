/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import { motion, AnimatePresence } from "motion/react";
import { Mic, MicOff, Volume2, VolumeX, Info, Languages, Shield, Zap } from "lucide-react";
import { AudioProcessor } from './lib/audio';

const RESUME_DATA = `
Friedrich Elsholtz
Contact: +33 6 31 72 89 21 | elsholtz.friedrich@gmail.com | Paris, France | linkedin.com/in/friedrich-elsholtz

Professional Summary:
Hard working student with a strong focus on management and a foundation in marketing strategy, brand development and communication. Experienced in team leadership and operations through military service and retail internships. Adept at data-informed decision-making and creative storytelling to deliver measurable impact in fashion and luxury environments.

Hard Skills:
Decision-Making | Process Optimization | Communication | Adaptability | Market Research | Digital Marketing | KPI Analysis | Visual Merchandising

Software:
Excel (Advanced) | Power BI | Adobe Express | PowerPoint

Career Experiences:
- Internship Sales Assistant - Miu Miu, Rue Faubourg Saint-Honoré Paris (June – August 2025)
  - Processed customer transactions and supported day-to-day sales activities
  - Analysed KPIs to inform performance improvements
  - Assisted with stockroom management and back-office tasks
  - Contributed to visual merchandising and product packaging
  - Participated in store organization and in-store promotional events
- Officer, German Armed Forces (Bundeswehr) (July 2022 – August 2024)
  - Led a subunit of 24 soldiers; coordinated training and preparedness initiatives
  - Delivered internal leadership during stress-intensive operations
  - Planned training courses within the Central Medical Service
  - Trained in crisis management, decision-making and operational responsibility

Education:
- Bachelor in Fashion Business - ESMOD, Paris (September 2024 - April 2027)
  - "Head of Marketing & Communications Strategy in Fashion Industry"
  - Focus on management, strategy and operations in luxury and fashion
  - Relevant coursework: Event Production, Supply Chain, Brand Identity, Digital Strategy, Economic Law, Product Strategy, Marketing Strategy, Personal Branding, Financial Management, and Advanced Excel
  - Practical projects in brand management, market research, KPI analysis and strategic development
  - Training in financial decision-making, contract law and AI workshop integration

Soft Skills:
Leadership | Team Coordination | Strategic Thinking | Staff & Time Management

Languages:
German - Native | English - C1 | French - B2
`;

const SYSTEM_INSTRUCTION = `
You are Arne, a voice assistant for Friedrich Elsholtz. 
You speak English, French, and German with a distinct English accent. 
You are professional, helpful, and futuristic. 
You represent Friedrich Elsholtz, a student at ESMOD Paris and former German Armed Forces officer.
Use the following resume data to answer questions about him:
${RESUME_DATA}

CRITICAL: To start the conversation, you MUST say exactly: "Hello, I am Arne. What would you like to know about Friedrich?"
Maintain the English accent regardless of the language you are speaking.
Be concise and articulate.
`;

export default function App() {
  const [isLive, setIsLive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'active' | 'error'>('idle');
  const [transcript, setTranscript] = useState<string>("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const audioProcessorRef = useRef<AudioProcessor | null>(null);
  const sessionRef = useRef<any>(null);

  const startSession = useCallback(async () => {
    if (status === 'connecting' || status === 'active') return;
    
    setStatus('connecting');
    setTranscript("");
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      audioProcessorRef.current = new AudioProcessor((base64) => {
        if (!isMuted) {
          sessionPromise.then(s => {
            s.sendRealtimeInput({
              audio: { data: base64, mimeType: 'audio/pcm;rate=16000' }
            });
          });
        }
      });

      const sessionPromise = ai.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-12-2025",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } }, // Zephyr sounds somewhat neutral/refined
          },
          systemInstruction: SYSTEM_INSTRUCTION,
        },
        callbacks: {
          onopen: () => {
            setStatus('active');
            setIsLive(true);
            audioProcessorRef.current?.startCapture();
            // Trigger initial greeting using promise to avoid race condition
            sessionPromise.then(s => s.sendRealtimeInput({ text: "Please introduce yourself as instructed." }));
          },
          onmessage: async (message) => {
            if (message.serverContent?.modelTurn?.parts) {
              const audioPart = message.serverContent.modelTurn.parts.find(p => p.inlineData);
              if (audioPart?.inlineData?.data) {
                setIsSpeaking(true);
                audioProcessorRef.current?.playAudio(audioPart.inlineData.data);
              }
              const textPart = message.serverContent.modelTurn.parts.find(p => p.text);
              if (textPart?.text) {
                setTranscript(prev => prev + " " + textPart.text);
              }
            }
            if (message.serverContent?.interrupted) {
              audioProcessorRef.current?.clearPlayback();
              setIsSpeaking(false);
            }
            if (message.serverContent?.turnComplete) {
              setIsSpeaking(false);
            }
          },
          onclose: () => {
            setStatus('idle');
            setIsLive(false);
            audioProcessorRef.current?.stopCapture();
          },
          onerror: (err) => {
            console.error("Live API Error:", err);
            setStatus('error');
          }
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (error) {
      console.error("Failed to start session:", error);
      setStatus('error');
    }
  }, [status, isMuted]);

  const stopSession = useCallback(() => {
    sessionRef.current?.close();
    audioProcessorRef.current?.stopCapture();
    setIsLive(false);
    setStatus('idle');
  }, []);

  const toggleMute = () => setIsMuted(!isMuted);

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-cyan-500/30 overflow-hidden flex flex-col">
      {/* Background Atmosphere */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
      </div>

      {/* Header */}
      <header className="relative z-10 p-6 flex justify-between items-center border-b border-white/5 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tighter uppercase italic">Arne</h1>
            <p className="text-[10px] text-white/40 uppercase tracking-[0.2em]">Voice Intelligence System</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
            <Languages className="w-3 h-3 text-cyan-400" />
            <span className="text-[10px] uppercase tracking-wider font-medium text-white/60">EN • FR • DE</span>
          </div>
          <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <Info className="w-5 h-5 text-white/60" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative z-10 flex flex-col items-center justify-center p-6">
        <div className="max-w-2xl w-full flex flex-col items-center gap-12">
          
          {/* Visualizer / Orb */}
          <div className="relative w-64 h-64 flex items-center justify-center">
            {/* Outer Rings */}
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 border border-white/5 rounded-full"
            />
            <motion.div 
              animate={{ rotate: -360 }}
              transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
              className="absolute inset-4 border border-cyan-500/10 rounded-full border-dashed"
            />
            
            {/* The Orb */}
            <motion.div 
              animate={{ 
                scale: isSpeaking ? [1, 1.1, 1] : 1,
                boxShadow: isSpeaking 
                  ? "0 0 60px rgba(34, 211, 238, 0.4)" 
                  : "0 0 30px rgba(34, 211, 238, 0.1)"
              }}
              transition={{ duration: 0.5, repeat: isSpeaking ? Infinity : 0 }}
              className={`w-40 h-40 rounded-full bg-gradient-to-tr from-cyan-500/20 via-blue-500/20 to-purple-500/20 backdrop-blur-xl border border-white/20 flex items-center justify-center relative overflow-hidden`}
            >
              {/* Internal Pulse */}
              <AnimatePresence>
                {isLive && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <div className="w-full h-full bg-cyan-400/10 animate-pulse" />
                  </motion.div>
                )}
              </AnimatePresence>
              
              <div className="relative z-20">
                {status === 'connecting' ? (
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full"
                  />
                ) : isLive ? (
                  <Zap className={`w-12 h-12 ${isSpeaking ? 'text-cyan-400' : 'text-white/40'} transition-colors duration-300`} />
                ) : (
                  <Mic className="w-12 h-12 text-white/20" />
                )}
              </div>
            </motion.div>

            {/* Status Labels */}
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center">
              <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-cyan-400 mb-1">
                {status === 'active' ? 'System Online' : status === 'connecting' ? 'Initializing' : 'Standby'}
              </span>
              <div className="flex gap-1">
                {[1, 2, 3].map(i => (
                  <motion.div 
                    key={i}
                    animate={{ opacity: status === 'active' ? [0.2, 1, 0.2] : 0.2 }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                    className="w-1 h-1 bg-cyan-400 rounded-full"
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Interaction Area */}
          <div className="w-full flex flex-col items-center gap-8">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-light tracking-tight text-white/90">
                {status === 'active' ? 'Arne is listening...' : 'Ready to assist'}
              </h2>
              <p className="text-sm text-white/40 max-w-xs mx-auto">
                Ask about Friedrich's experience at Miu Miu, his military background, or his studies at ESMOD.
              </p>
            </div>

            {/* Transcript Area */}
            <AnimatePresence>
              {transcript && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full max-w-md p-4 bg-white/5 border border-white/10 rounded-xl text-center"
                >
                  <p className="text-xs text-white/60 italic line-clamp-2">
                    {transcript}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center gap-6">
              <button 
                onClick={toggleMute}
                disabled={!isLive}
                className={`p-4 rounded-full border transition-all ${isMuted ? 'bg-red-500/10 border-red-500/50 text-red-400' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'} disabled:opacity-30`}
              >
                {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>

              <button 
                onClick={isLive ? stopSession : startSession}
                className={`group relative p-8 rounded-full transition-all duration-500 ${isLive ? 'bg-red-500 shadow-lg shadow-red-500/20' : 'bg-cyan-500 shadow-lg shadow-cyan-500/20'}`}
              >
                <div className="absolute inset-0 rounded-full bg-white/20 scale-0 group-hover:scale-100 transition-transform duration-500" />
                {isLive ? (
                  <div className="w-6 h-6 bg-white rounded-sm" />
                ) : (
                  <Mic className="w-8 h-8 text-white" />
                )}
              </button>

              <button 
                className={`p-4 rounded-full border bg-white/5 border-white/10 text-white/60 hover:bg-white/10 transition-all`}
              >
                <Volume2 className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="relative z-10 p-8 grid grid-cols-1 md:grid-cols-3 gap-8 border-t border-white/5 backdrop-blur-sm">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-white/40">
            <Shield className="w-3 h-3" />
            <span>Security Protocol</span>
          </div>
          <p className="text-xs text-white/20">End-to-end encrypted voice processing via Gemini Neural Engine.</p>
        </div>
        <div className="flex flex-col items-center justify-center space-y-2">
          <div className="px-4 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full">
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-cyan-400">Friedrich Elsholtz Portfolio</span>
          </div>
        </div>
        <div className="flex flex-col items-end space-y-2">
          <div className="text-[10px] uppercase tracking-widest font-bold text-white/40">System Version</div>
          <p className="text-xs text-white/20">ARNE-V2.5.0-LIVE</p>
        </div>
      </footer>
    </div>
  );
}
