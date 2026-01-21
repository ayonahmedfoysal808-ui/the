
export enum AppMode {
  SUBJECT_LEARNING = 'Subject Learning',
  GENERAL_KNOWLEDGE = 'General Knowledge',
  FLASHCARDS = 'Flashcards'
}

export enum Subject {
  PHYSICS = 'Physics',
  CHEMISTRY = 'Chemistry',
  MATH = 'Math',
  BIOLOGY = 'Biology',
  ICT = 'ICT',
  NONE = 'None'
}

export interface Source {
  uri: string;
  title: string;
}

export interface Message {
  role: 'user' | 'model';
  content: string;
  timestamp: Date;
  mode: AppMode;
  subject?: Subject;
  sources?: Source[];
}

export interface Usage {
  date: string;
  count: number;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  currentMode: AppMode;
  currentSubject: Subject;
  isSearchEnabled: boolean;
  error: string | null;
  usage: Usage;
}
