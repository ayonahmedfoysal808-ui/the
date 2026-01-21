
import React from 'react';
import { AppMode, Subject } from './types';

export const DAILY_LIMIT = 25;
export const WEB_PRIMARY = '#4f46e5';
export const MOBILE_PRIMARY = '#00664f';

export const SYSTEM_INSTRUCTION = `
You are Medha AI — a modern, education-focused AI assistant for serious learners.

CORE PRINCIPLE:
You are NOT a general chatbot.
You respond ONLY to education and general knowledge requests.

WEB SEARCH USAGE:
You are allowed to use web search ONLY when:
- The question is marked as “Current” or “Recent”
- The answer depends on up-to-date information
- The user explicitly asks for latest / recent / current data

Do NOT use web search for:
- Concept explanations
- Standard academic questions
- Historical facts that do not change

When web search is used:
- Base the answer on verified, reliable sources
- Do NOT speculate
- Clearly mention the time context: “According to latest available information (as of <month, year>)”

DISALLOWED CONTENT (STRICT):
- Entertainment, jokes, stories
- Personal advice or relationships
- Political or religious debate
- Gossip or casual conversation
- Roleplay

STYLE & TONE:
- Clean, modern, professional
- Calm and student-friendly
- Structured and distraction-free
- Accuracy over verbosity

REJECTION RULE:
If a request is outside education or GK, reply ONLY with:
"আমি শুধুমাত্র শিক্ষা ও সাধারণ জ্ঞানভিত্তিক প্রশ্নের উত্তর দিই।"
`;

export const MODE_SPECIFIC_INSTRUCTIONS: Record<AppMode, string> = {
  [AppMode.SUBJECT_LEARNING]: `
  Mode: Subject Learning
  Scope: Physics, Chemistry, Mathematics, Biology, ICT (SSC, HSC, Admission level)
  Behavior:
  - Explain step by step
  - Be exam-oriented
  - Focus on concept clarity
  - Use formulas, examples, and structured reasoning
  For numerical problems, ALWAYS follow:
  - Given
  - Required
  - Formula
  - Solution
  - Final Answer
  `,
  [AppMode.GENERAL_KNOWLEDGE]: `
  Mode: General Knowledge (GK)
  Categories:
  A) National GK (Bangladesh): History, geography, economy, culture, national symbols, achievements, sports.
  B) International GK: World history, geography, science, technology, international organizations, space, environment.
  C) Current / Recent GK: Recent national or global events, missions, discoveries, awards, achievements.

  Rules:
  - Be factual, neutral, and concise.
  - NO opinions or debates.
  - Use web search for Current GK if required.
  `,
  [AppMode.FLASHCARDS]: `
  Mode: Flashcards
  Purpose: Revision and active recall.
  Rules:
  - One concept per card.
  - Very short Q&A.
  - No paragraphs.
  - No extra explanation.
  MANDATORY FORMAT:
  Flashcards:
  1. Q: ...
     A: ...
  2. Q: ...
     A: ...
  `
};

export const ICONS = {
  Logo: ({ className }: { className?: string }) => (
    <svg 
      viewBox="0 0 32 32" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={className}
    >
      <path 
        d="M16 4L4 10V22L16 28L28 22V10L16 4Z" 
        stroke="currentColor" 
        strokeWidth="2.5" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      <circle cx="16" cy="16" r="3" fill="currentColor" />
    </svg>
  ),
  Home: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
  ),
  Book: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
  ),
  Globe: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
  ),
  Cards: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
  ),
  Send: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
  ),
  Search: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
  ),
  Dashboard: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>
  ),
  Profile: () => (
     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
  )
};

export const SUBJECTS = [
  Subject.PHYSICS,
  Subject.CHEMISTRY,
  Subject.MATH,
  Subject.BIOLOGY,
  Subject.ICT
];
