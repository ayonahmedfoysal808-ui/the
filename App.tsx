
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AppMode, Subject, Message, ChatState, Usage, Source } from './types.ts';
import { ICONS, SUBJECTS, DAILY_LIMIT, WEB_PRIMARY, MOBILE_PRIMARY } from './constants.tsx';
import { sendMessageToMedha } from './geminiService.ts';

const STORAGE_KEY_PREFS = 'medha_prefs_v3';
const STORAGE_KEY_USAGE = 'medha_usage_v3';

const App: React.FC = () => {
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  const [activeTab, setActiveTab] = useState<'home' | 'subjects' | 'gk' | 'flashcards'>('home');

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 768;

  const loadPrefs = () => {
    const saved = localStorage.getItem(STORAGE_KEY_PREFS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          mode: parsed.mode || AppMode.SUBJECT_LEARNING,
          subject: parsed.subject || Subject.NONE,
          isSearchEnabled: parsed.isSearchEnabled ?? false
        };
      } catch (e) { return null; }
    }
    return null;
  };

  const getUsage = (): Usage => {
    const today = new Date().toISOString().split('T')[0];
    const saved = localStorage.getItem(STORAGE_KEY_USAGE);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.date === today) return parsed;
      } catch (e) {}
    }
    return { date: today, count: 0 };
  };

  const updateUsage = () => {
    const current = getUsage();
    const next = { ...current, count: current.count + 1 };
    localStorage.setItem(STORAGE_KEY_USAGE, JSON.stringify(next));
    setState(prev => ({ ...prev, usage: next }));
  };

  const initialPrefs = loadPrefs() || { mode: AppMode.SUBJECT_LEARNING, subject: Subject.NONE, isSearchEnabled: false };

  const [state, setState] = useState<ChatState>({
    messages: [],
    isLoading: false,
    currentMode: initialPrefs.mode,
    currentSubject: initialPrefs.subject,
    isSearchEnabled: initialPrefs.isSearchEnabled,
    error: null,
    usage: getUsage()
  });

  const [input, setInput] = useState('');
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showSubjectMenu, setShowSubjectMenu] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFS, JSON.stringify({
      mode: state.currentMode,
      subject: state.currentSubject,
      isSearchEnabled: state.isSearchEnabled
    }));
  }, [state.currentMode, state.currentSubject, state.isSearchEnabled]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [state.messages, state.isLoading, scrollToBottom, activeTab]);

  const validateRequest = () => {
    if (state.usage.count >= DAILY_LIMIT) {
      setState(prev => ({ ...prev, error: `আজকের লিমিট (${DAILY_LIMIT}) শেষ। আগামীকাল আবার চেষ্টা করুন।` }));
      return false;
    }
    if (state.currentMode === AppMode.SUBJECT_LEARNING && state.currentSubject === Subject.NONE) {
      setState(prev => ({ ...prev, error: 'অনুগ্রহ করে একটি বিষয় (Subject) নির্বাচন করুন।' }));
      if (isMobile) setActiveTab('subjects');
      return false;
    }
    return true;
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || state.isLoading) return;
    if (!validateRequest()) return;

    const userMsg: Message = {
      role: 'user',
      content: input,
      timestamp: new Date(),
      mode: state.currentMode,
      subject: state.currentSubject
    };

    const currentInput = input;
    setInput('');
    
    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMsg],
      isLoading: true,
      error: null
    }));

    if (isMobile) setActiveTab('home');

    try {
      const response = await sendMessageToMedha(
        currentInput, 
        state.currentMode, 
        state.currentSubject, 
        state.messages, 
        state.isSearchEnabled
      );
      updateUsage();

      const modelMsg: Message = {
        role: 'model',
        content: response.text,
        timestamp: new Date(),
        mode: state.currentMode,
        subject: state.currentSubject,
        sources: response.sources
      };

      setState(prev => ({
        ...prev,
        messages: [...prev.messages, modelMsg],
        isLoading: false
      }));
      setFlashcardIndex(0);
      setIsFlipped(false);
    } catch (err: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err.message || 'Something went wrong'
      }));
    }
  };

  const formatText = (text: string) => {
    return text.split('\n').map((line, i) => {
      let formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-900 font-bold">$1</strong>');
      if (line.trim().startsWith('•') || line.trim().startsWith('-')) {
        const bulletColor = isMobile ? 'marker:text-[#00664f]' : 'marker:text-indigo-500';
        return <li key={i} className={`ml-5 list-disc ${bulletColor} mb-2 pl-1`} dangerouslySetInnerHTML={{ __html: formatted.replace(/^[•-]\s*/, '') }} />;
      }
      formatted = formatted.replace(/_(\d+)/g, '<sub>$1</sub>');
      return <p key={i} className="mb-2" dangerouslySetInnerHTML={{ __html: formatted }} />;
    });
  };

  const renderFlashcards = (content: string) => {
    const cards = content.split(/\d+\.\s+Q:/).filter(Boolean);
    if (cards.length === 0) return <div className="p-4">{content}</div>;

    const currentCardStr = cards[flashcardIndex];
    if (!currentCardStr) return <div className="p-4">{content}</div>;

    const [question, answer] = currentCardStr.split('A:');

    return (
      <div className="flex flex-col items-center justify-center py-4 w-full">
        <div 
          className={`card-container w-full aspect-[4/3] max-w-sm ${isFlipped ? 'is-flipped' : ''}`}
          onClick={() => setIsFlipped(!isFlipped)}
        >
          <div className="card-inner">
            <div className="card-front soft-shadow">
              <span className={`text-[10px] font-bold tracking-[0.1em] uppercase mb-4 opacity-70 ${isMobile ? 'text-[#00664f]' : 'text-indigo-500'}`}>Concept {flashcardIndex + 1}</span>
              <h3 className="text-lg font-medium text-slate-800 leading-relaxed bangla-text">{question?.trim()}</h3>
              <div className="mt-auto text-[10px] text-slate-400 font-bold uppercase tracking-widest">Tap to flip</div>
            </div>
            <div className="card-back soft-shadow">
              <span className={`text-[10px] font-bold tracking-[0.1em] uppercase mb-4 opacity-70 ${isMobile ? 'text-emerald-600' : 'text-indigo-600'}`}>Answer</span>
              <div className="text-base text-slate-700 leading-relaxed bangla-text">{answer?.trim()}</div>
              <div className="mt-auto text-[10px] text-slate-400 font-bold uppercase tracking-widest">Tap to flip</div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-6 mt-8">
          <button 
            disabled={flashcardIndex === 0}
            onClick={(e) => { e.stopPropagation(); setFlashcardIndex(prev => prev - 1); setIsFlipped(false); }}
            className="p-3 bg-white border border-slate-100 text-slate-600 rounded-full disabled:opacity-20 active:scale-95 shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <span className="text-xs font-bold text-slate-400 font-mono tracking-widest">
            {flashcardIndex + 1} / {cards.length}
          </span>
          <button 
            disabled={flashcardIndex === cards.length - 1}
            onClick={(e) => { e.stopPropagation(); setFlashcardIndex(prev => prev + 1); setIsFlipped(false); }}
            className="p-3 bg-white border border-slate-100 text-slate-600 rounded-full disabled:opacity-20 active:scale-95 shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="m9 18 6-6-6-6"/></svg>
          </button>
        </div>
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // DESKTOP VIEWS (WEB STYLE)
  // ---------------------------------------------------------------------------

  const DesktopLayout = () => (
    <div className="flex h-screen w-full bg-[#fcfcfd] text-slate-800 overflow-hidden">
      <aside className="w-72 bg-[#f9fafb] border-r border-slate-100 flex flex-col z-40">
        <div className="p-6 flex items-center gap-3 mb-4">
          <div className="w-8 h-8 text-indigo-600"><ICONS.Logo /></div>
          <h1 className="text-lg font-bold tracking-tight text-slate-800 font-inter">Medha AI</h1>
        </div>
        <div className="px-4 mb-6">
          <button 
            onClick={() => setState(p => ({...p, messages: []}))}
            className="w-full py-3 px-4 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 shadow-sm flex items-center justify-center gap-2 hover:bg-slate-50 transition-all active:scale-95"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M5 12h14m-7-7v14"/></svg>
            NEW CHAT
          </button>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          <div className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest opacity-60">Menu</div>
          <button onClick={() => setState(p => ({...p, messages: []}))} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${state.messages.length === 0 ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-100'}`}>
            <ICONS.Dashboard /> Dashboard
          </button>
          <div className="pt-8 px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest opacity-60">Preferences</div>
          <div className="px-4 space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Mode</label>
              <select value={state.currentMode} onChange={(e) => setState(p => ({...p, currentMode: e.target.value as AppMode}))} className="w-full bg-white border border-slate-200 rounded-lg text-xs font-semibold py-2 px-2 focus:ring-1 focus:ring-indigo-500/20">
                {Object.values(AppMode).map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            {state.currentMode === AppMode.SUBJECT_LEARNING && (
              <div className="space-y-1 animate-fade-in">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Subject</label>
                <select value={state.currentSubject} onChange={(e) => setState(p => ({...p, currentSubject: e.target.value as Subject}))} className="w-full bg-white border border-slate-200 rounded-lg text-xs font-semibold py-2 px-2">
                  <option value={Subject.NONE}>Select Subject</option>
                  {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}
          </div>
        </nav>
        <div className="p-6 border-t border-slate-100 bg-white/40">
           <div className="flex items-center justify-between mb-2">
             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Usage</span>
             <span className="text-[10px] font-bold text-slate-600">{state.usage.count}/{DAILY_LIMIT}</span>
           </div>
           <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
             <div className="h-full transition-all duration-1000 bg-indigo-500" style={{ width: `${(state.usage.count / DAILY_LIMIT) * 100}%` }}></div>
           </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative bg-white">
        <header className="h-16 flex items-center justify-between px-8 border-b border-slate-50 bg-white/80 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${state.usage.count < DAILY_LIMIT ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{state.usage.count < DAILY_LIMIT ? 'Ready to Learn' : 'Limit Reached'}</span>
          </div>
          <div className="flex items-center gap-2">
             <div className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-tight">{state.currentMode}</div>
             {state.currentSubject !== Subject.NONE && <div className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-tight">{state.currentSubject}</div>}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          {state.messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-6 py-12 animate-fade-in">
              <div className="w-16 h-16 mb-8 text-indigo-500 bg-indigo-50 rounded-2xl flex items-center justify-center"><ICONS.Logo className="w-10 h-10" /></div>
              <h2 className="text-3xl font-semibold text-slate-800 mb-3 tracking-tight">Hello, Student</h2>
              <p className="text-slate-500 max-w-md mx-auto bangla-text text-base leading-relaxed">আপনার শিক্ষাযাত্রায় আমি পাশে আছি। শুরু করার জন্য নিচ থেকে একটি মুড নির্বাচন করুন এবং আপনার প্রশ্নটি লিখুন।</p>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-6 py-12 space-y-10">
              {state.messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} fade-in`}>
                  <div className={`max-w-[90%] ${msg.role === 'user' ? 'bg-slate-900 text-white rounded-[24px] rounded-tr-none px-6 py-4 shadow-lg' : 'w-full'}`}>
                    {msg.role === 'model' && (
                      <div className="flex gap-5">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 mt-1"><ICONS.Logo className="w-6 h-6" /></div>
                        <div className="flex-1 text-[15px] leading-[1.8] text-slate-700 bangla-text">
                          {msg.mode === AppMode.FLASHCARDS && msg.content.includes('Flashcards:') ? renderFlashcards(msg.content) : formatText(msg.content)}
                          {msg.sources && msg.sources.length > 0 && (
                            <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap gap-2">
                              {msg.sources.map((s, idx) => (
                                <a key={idx} href={s.uri} target="_blank" className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg hover:bg-indigo-100 transition-colors">{s.title.substring(0, 20)}...</a>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {msg.role === 'user' && <div className="text-[15px] font-medium leading-relaxed bangla-text">{msg.content}</div>}
                  </div>
                </div>
              ))}
              {state.isLoading && <div className="flex gap-2 items-center py-5 px-1 animate-pulse"><div className="w-1.5 h-1.5 bg-indigo-300 rounded-full animate-bounce"></div><div className="w-1.5 h-1.5 bg-indigo-300 rounded-full animate-bounce [animation-delay:-0.15s]"></div><div className="w-1.5 h-1.5 bg-indigo-300 rounded-full animate-bounce [animation-delay:-0.3s]"></div></div>}
              {state.error && <div className="mx-auto max-w-md p-5 bg-red-50 border border-red-100 rounded-2xl text-red-500 text-xs text-center font-bold tracking-tight shadow-sm">{state.error}</div>}
              <div ref={messagesEndRef} className="h-4" />
            </div>
          )}
        </div>

        <div className="p-8 bg-gradient-to-t from-white via-white to-transparent">
          <div className="max-w-3xl mx-auto">
            <form onSubmit={handleSendMessage} className="relative flex items-center bg-white rounded-2xl p-1.5 border border-slate-100 shadow-xl shadow-slate-200/50">
              <button type="button" onClick={() => setState(p => ({...p, isSearchEnabled: !p.isSearchEnabled}))} className={`p-3 rounded-xl transition-all ${state.isSearchEnabled ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400 hover:text-indigo-600'}`}><ICONS.Search /></button>
              <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type your query..." className="flex-1 bg-transparent border-none text-slate-800 text-[15px] px-4 py-3 focus:outline-none placeholder:text-slate-300 font-inter font-medium bangla-text" />
              <button type="submit" disabled={state.isLoading || !input.trim() || state.usage.count >= DAILY_LIMIT} className="w-12 h-12 bg-slate-900 text-white rounded-xl shadow-lg flex items-center justify-center disabled:bg-slate-100 disabled:text-slate-300 hover:bg-black transition-all active:scale-90"><ICONS.Send /></button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );

  // ---------------------------------------------------------------------------
  // MOBILE VIEWS (CHORCHA GREEN STYLE)
  // ---------------------------------------------------------------------------

  const MobileHome = () => (
    <div className="flex-1 flex flex-col overflow-hidden">
      {state.messages.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-8 animate-fade-in py-12">
          <div className="w-20 h-20 mb-6 text-[#00664f] bg-emerald-50 rounded-3xl flex items-center justify-center soft-shadow"><ICONS.Logo className="w-12 h-12" /></div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2 tracking-tight">Hello, Learner</h2>
          <p className="text-slate-500 max-w-xs mx-auto bangla-text text-[15px] leading-relaxed opacity-90">আপনার শিক্ষাযাত্রায় আমি পাশে আছি। শুরু করতে প্রশ্ন করুন অথবা নিচ থেকে একটি বিষয় বেছে নিন।</p>
          <div className="mt-10 grid grid-cols-2 gap-3 w-full max-w-xs">
            <button onClick={() => setActiveTab('subjects')} className="p-4 bg-white border border-slate-100 rounded-2xl text-left soft-shadow active:scale-95 transition-transform"><div className="text-[#00664f] mb-2"><ICONS.Book /></div><div className="text-xs font-bold text-slate-800">Academic</div></button>
            <button onClick={() => setActiveTab('gk')} className="p-4 bg-white border border-slate-100 rounded-2xl text-left soft-shadow active:scale-95 transition-transform"><div className="text-[#00664f] mb-2"><ICONS.Globe /></div><div className="text-xs font-bold text-slate-800">GK Hub</div></button>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6">
          {state.messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} fade-in`}>
              <div className={`max-w-[85%] ${msg.role === 'user' ? 'bg-[#00664f] text-white rounded-2xl rounded-tr-none px-4 py-3 soft-shadow' : 'bg-white rounded-2xl rounded-tl-none px-4 py-3 border border-slate-100 soft-shadow'}`}>
                <div className="text-[14.5px] leading-relaxed bangla-text">
                  {msg.mode === AppMode.FLASHCARDS && msg.content.includes('Flashcards:') ? <div className="text-xs font-bold text-[#00664f] py-2">Flashcards generated! Switch to Cards tab to view.</div> : formatText(msg.content)}
                </div>
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-slate-50 space-y-1">
                    {msg.sources.slice(0, 2).map((s, idx) => (
                      <a key={idx} href={s.uri} target="_blank" className="text-[10px] font-bold text-[#00664f] flex items-center gap-1 opacity-70"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>{s.title.substring(0, 25)}...</a>
                    ))}
                  </div>
                )}
                <div className={`mt-2 text-[9px] font-bold uppercase tracking-wider opacity-30 ${msg.role === 'user' ? 'text-white' : 'text-slate-400'}`}>{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            </div>
          ))}
          {state.isLoading && <div className="flex gap-2 items-center py-2 animate-pulse"><div className="w-1.5 h-1.5 bg-[#00664f] rounded-full animate-bounce"></div><div className="w-1.5 h-1.5 bg-[#00664f] rounded-full animate-bounce [animation-delay:-0.15s]"></div><div className="w-1.5 h-1.5 bg-[#00664f] rounded-full animate-bounce [animation-delay:-0.3s]"></div></div>}
          <div ref={messagesEndRef} className="h-4" />
        </div>
      )}
      <div className="px-5 py-4 bg-white/90 backdrop-blur-md input-shadow sticky bottom-0 z-20">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2 bg-slate-50 rounded-2xl p-1.5 border border-slate-100 transition-all focus-within:ring-2 focus-within:ring-[#00664f]/10">
          <button type="button" onClick={() => setActiveTab('subjects')} className={`p-2.5 rounded-xl ${state.currentSubject !== Subject.NONE ? 'bg-[#00664f] text-white' : 'text-slate-400'}`}><ICONS.Book /></button>
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type a message..." className="flex-1 bg-transparent text-sm px-2 py-2 text-slate-800 bangla-text focus:outline-none" />
          <button type="button" onClick={() => setState(p => ({...p, isSearchEnabled: !p.isSearchEnabled}))} className={`p-2.5 rounded-xl ${state.isSearchEnabled ? 'text-[#00664f] bg-emerald-50' : 'text-slate-300'}`}><ICONS.Search /></button>
          <button type="submit" disabled={!input.trim() || state.isLoading} className="p-3 bg-[#00664f] text-white rounded-xl disabled:bg-slate-200 active:scale-95 transition-transform"><ICONS.Send /></button>
        </form>
      </div>
    </div>
  );

  const MobileLayout = () => (
    <div className="flex flex-col h-screen w-full bg-[#f9fafb] overflow-hidden relative">
      <header className="h-14 shrink-0 flex items-center justify-between px-6 bg-white border-b border-slate-50 z-30 sticky top-0">
        <div className="flex items-center gap-2">
          <div className="text-[#00664f]"><ICONS.Logo className="w-6 h-6" /></div>
          <h1 className="text-base font-bold tracking-tight text-slate-900 font-inter">Medha AI</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-slate-400"><ICONS.Profile /></div>
        </div>
      </header>

      <main className="flex-1 flex flex-col relative overflow-hidden">
        {activeTab === 'home' && <MobileHome />}
        {activeTab === 'subjects' && (
          <div className="flex-1 px-6 py-10 animate-fade-in overflow-y-auto">
            <h2 className="text-xl font-bold text-slate-900 mb-2">Academic Subjects</h2>
            <div className="grid grid-cols-1 gap-3 pb-24">
              {SUBJECTS.map((subj) => (
                <button key={subj} onClick={() => { setState(p => ({...p, currentSubject: subj, currentMode: AppMode.SUBJECT_LEARNING})); setActiveTab('home'); }} className={`flex items-center justify-between p-5 rounded-2xl border transition-all active:scale-[0.98] ${state.currentSubject === subj ? 'bg-[#00664f] border-[#00664f] text-white' : 'bg-white border-slate-100 text-slate-700'}`}>
                  <div className="flex items-center gap-4"><div className={`p-2 rounded-lg ${state.currentSubject === subj ? 'bg-white/20' : 'bg-emerald-50 text-[#00664f]'}`}><ICONS.Book /></div><span className="font-bold text-sm">{subj}</span></div>
                </button>
              ))}
            </div>
          </div>
        )}
        {activeTab === 'gk' && (
          <div className="flex-1 px-6 py-10 animate-fade-in overflow-y-auto">
            <h2 className="text-xl font-bold text-slate-900 mb-2">General Knowledge</h2>
            <div className="space-y-4">
              {['National (Bangladesh)', 'International', 'Current / Recent'].map(cat => (
                <button key={cat} onClick={() => { setInput(`Give me some information about ${cat} GK`); setState(p => ({...p, currentMode: AppMode.GENERAL_KNOWLEDGE})); setActiveTab('home'); }} className="w-full flex items-center gap-5 p-5 bg-white border border-slate-100 rounded-2xl soft-shadow active:scale-[0.98] transition-all">
                  <div className="p-3 rounded-xl bg-emerald-50 text-[#00664f]"><ICONS.Globe /></div>
                  <div className="text-left"><div className="font-bold text-sm text-slate-800">{cat}</div><div className="text-[10px] font-bold text-slate-400 uppercase">Tap to explore</div></div>
                </button>
              ))}
            </div>
          </div>
        )}
        {activeTab === 'flashcards' && (
          <div className="flex-1 px-6 py-10 animate-fade-in overflow-y-auto">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Flashcards</h2>
            {state.messages.some(m => m.mode === AppMode.FLASHCARDS && m.content.includes('Flashcards:')) ? (
              renderFlashcards([...state.messages].reverse().find(m => m.mode === AppMode.FLASHCARDS && m.content.includes('Flashcards:'))?.content || '')
            ) : (
              <div className="text-center py-20 px-10 bg-white border border-slate-100 rounded-3xl soft-shadow">
                <div className="text-slate-300 mb-4 flex justify-center"><ICONS.Cards /></div>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest leading-loose">No active revision session.<br/>Ask for flashcards in the chat first!</p>
              </div>
            )}
          </div>
        )}
      </main>

      <nav className="h-16 shrink-0 bg-white border-t border-slate-100 flex items-center justify-around px-4 nav-shadow z-40 safe-bottom">
        {[
          { id: 'home', label: 'Home', icon: <ICONS.Home /> },
          { id: 'subjects', label: 'Subjects', icon: <ICONS.Book /> },
          { id: 'gk', label: 'GK', icon: <ICONS.Globe /> },
          { id: 'flashcards', label: 'Cards', icon: <ICONS.Cards /> }
        ].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex flex-col items-center gap-1 transition-all ${activeTab === tab.id ? 'mobile-green-active' : 'text-slate-300'}`}>
            {tab.icon} <span className="text-[10px] font-bold uppercase tracking-tight">{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );

  return isMobile ? <MobileLayout /> : <DesktopLayout />;
};

export default App;
