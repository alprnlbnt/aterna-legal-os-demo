export type Role = 'yonetici_avukat' | 'calisan_avukat' | 'sekreter' | 'stajyer';
export type Density = 'ferah' | 'siki';
export type ApprovalLevel = 'tek' | 'toplu' | 'bilgi';
export type StatusTone = 'candidate' | 'pending' | 'success' | 'danger' | 'neutral' | 'info';
export type Theme = 'light' | 'dark';

export interface Office {
  id: string;
  name: string;
  letterhead: string;
  languageProfile: string;
  prohibitedWords: string[];
  templates: string[];
}

export interface User {
  id: string;
  name: string;
  shortName: string;
  role: Role;
  authorizedFileIds: string[];
  active: boolean;
  email?: string;
}

export interface Contact {
  id: string;
  kind: 'muvekkil' | 'aday' | 'karsi_taraf';
  name: string;
  communication: string;
  conflictFlag?: boolean;
  referredBy?: string;
}

export interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  detail: string;
}

export interface CaseFile {
  id: string;
  status: 'aktif' | 'potansiyel' | 'kapali';
  name: string;
  caseNumber?: string;
  court?: string;
  clientId: string;
  opposingPartyId?: string;
  responsibleLawyerId: string;
  subject: string;
  private: boolean;
  deadlineIds: string[];
  taskIds: string[];
  documentIds: string[];
  incomingDocumentIds: string[];
  notes: string[];
  privateNotes: string[];
  timeline: TimelineEvent[];
  missingDocuments?: string[];
  convertedToId?: string;
}

export interface MatchCandidate {
  fileId: string;
  rationale: string;
  confidence: 'yuksek' | 'dusuk';
  sourcePassage: string;
}

export interface IncomingDocument {
  id: string;
  name: string;
  channel: 'fotograf' | 'dosya' | 'e-posta' | 'mesaj' | 'ses-ve-evrak';
  receivedAt: string;
  uploadedById: string;
  userNote: string;
  hash: string;
  groupId?: string;
  groupOrder?: string;
  status:
    | 'alindi'
    | 'guvenlik'
    | 'ocr'
    | 'inceleme_bekliyor'
    | 'onay_bekliyor'
    | 'baglandi'
    | 'eslesmemis';
  securityStatus: 'guvenli' | 'parolali' | 'zararli_suphesi';
  originalRef: string;
  ocrId?: string;
  matchCandidates: MatchCandidate[];
  taskCandidateIds: string[];
  duplicateOf?: string;
  duplicateDecision?: 'ayni' | 'yeni_surum' | 'iliskisiz';
  pendingFileId?: string;
}

export interface OcrResult {
  id: string;
  incomingDocumentId: string;
  text: string;
  uncertainPhrases: string[];
  engineVersion: string;
  failed?: { reason: string };
}

export interface TaskCandidate {
  id: string;
  kind: 'gorev' | 'sure';
  title: string;
  fileId: string;
  sourceDocumentId: string;
  sourcePassage?: string;
  audioRange?: string;
  eventDate?: string;
  suggestedDueDate?: string;
  alternativeDates?: { date: string; context: string }[];
  uncertainty: string;
  verificationRequired: boolean;
  suggestedOwnerId?: string;
  status: 'aday' | 'onay_bekliyor' | 'teyit' | 'reddedildi' | 'duzeltildi';
  calculationExplanation: string;
}

export interface Task {
  id: string;
  fileId: string;
  title: string;
  ownerId: string;
  startDate: string;
  dueDate?: string;
  status: 'acik' | 'tamamlandi';
  dependentTaskIds: string[];
  sourceCandidateId?: string;
  subtaskIds: string[];
  origin: 'aday' | 'manuel';
  reminderAt?: string;
  completedAt?: string;
}

export interface Deadline {
  id: string;
  fileId: string;
  kind: 'zamanasimi' | 'hak_dusurucu' | 'vekaletname_bitis' | 'usul';
  triggeringEvent: string;
  dueDate: string;
  legalBasis: string;
  manual: boolean;
  alarmPattern: string;
  confirmedById?: string;
  confirmedAt?: string;
  sourceCandidateId?: string;
}

export interface DocumentField {
  label: string;
  value?: string;
  source: 'kullanici' | 'sablon' | 'ai';
  critical?: boolean;
}

export interface VersionDifference {
  clause: string;
  kind: 'eklendi' | 'cikarildi' | 'degisti';
  previous?: string;
  next?: string;
  critical: boolean;
}

export interface DocumentVersion {
  number: number;
  fields: DocumentField[];
  differences?: VersionDifference[];
  createdAt: string;
  sourceDescription: string;
}

export interface GeneratedDocument {
  id: string;
  fileId: string;
  kind: 'teklif' | 'sozlesme' | 'dava_hazirlik';
  name: string;
  versions: DocumentVersion[];
  status: 'eksik_bilgi' | 'taslak' | 'ic_onay_bekliyor' | 'gonderime_hazir' | 'gonderildi';
  internalApprovedAt?: string;
  sentAt?: string;
}

export interface Hearing {
  id: string;
  fileId: string;
  court: string;
  dateTime: string;
  lawyerId: string;
  preparationStatus: 'hazir' | 'eksik' | 'guncellendi';
  agenda: string;
  lastAction: string;
  missingPreparation: string[];
  preparationReport?: { title: string; text: string; source: string }[];
  voiceNoteIds: string[];
  pinnedOffline: boolean;
  reminderLeadHours?: number;
}

export interface VoiceNote {
  id: string;
  fileId: string;
  hearingId?: string;
  audioDuration: string;
  transcriptDraft: string;
  uncertainPhrases: string[];
  taskCandidateIds: string[];
  privacy: 'dosya' | 'gizli';
  status: 'taslak' | 'senkronizasyon_bekliyor' | 'kaydedildi';
}

export interface Notification {
  id: string;
  kind: string;
  safeTitle: string;
  relatedId: string;
  time: string;
  read: boolean;
}

export interface AuditEntry {
  id: string;
  time: string;
  actorId: string;
  actorRole: Role;
  action: string;
  objectType: string;
  objectId: string;
  previousValue?: string;
  nextValue?: string;
  reason?: string;
}

export interface LedgerEntry {
  id: string;
  fileId: string;
  date: string;
  kind: 'masraf' | 'tahsilat' | 'vekalet_ucreti' | 'karsi_yan_ucreti';
  description: string;
  amount: number;
  direction: 'borc' | 'alacak';
  approvalStatus: 'taslak' | 'onaylandi';
}

export interface DemoSettings {
  personaId: string;
  offline: boolean;
  simulatedNow: string;
  density: Density;
  approvalLevels: Record<string, ApprovalLevel>;
  tourActive: boolean;
  tourStep: number;
  lastSyncAt: string;
  screenState: 'default' | 'loading' | 'empty' | 'error';
  theme: Theme;
  notificationPrefs: {
    taskReminderLeadDays: number[];
    hearingReminderLeadDays: number[];
    muted: boolean;
  };
}

export interface DemoData {
  office: Office;
  users: User[];
  contacts: Contact[];
  files: CaseFile[];
  incomingDocuments: IncomingDocument[];
  ocrResults: OcrResult[];
  candidates: TaskCandidate[];
  tasks: Task[];
  deadlines: Deadline[];
  generatedDocuments: GeneratedDocument[];
  hearings: Hearing[];
  voiceNotes: VoiceNote[];
  notifications: Notification[];
  audit: AuditEntry[];
  ledger: LedgerEntry[];
  settings: DemoSettings;
}
