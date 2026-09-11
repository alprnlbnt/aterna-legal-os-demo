import { produce } from 'immer';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { makeSeed } from '../fixtures/seed';
import { appendAudit, appendDeniedAudit } from './actions';
import {
  assertCandidateCanBeConfirmed,
  assertExternalSendAllowed,
  assertFileAccess,
  assertFinalActionAllowed,
  assertIncomingAccess,
  assertManagerLawyer,
  assertRoleAllowed,
  assertStateTransition,
  InvariantError,
  relatedFileIdsForObject,
} from './invariants';
import type {
  ApprovalLevel,
  DemoData,
  Density,
  DocumentVersion,
  Hearing,
  LedgerEntry,
  Contact,
  Role,
  Task,
  TaskCandidate,
  Theme,
  User,
} from './types';

export interface PotentialInput {
  name: string;
  clientId: string;
  subject: string;
  responsibleLawyerId: string;
  opposingPartyId?: string;
  firstContact: string;
}

export interface ManualTaskInput {
  fileId: string;
  title: string;
  ownerId: string;
  startDate: string;
  dueDate?: string;
  reminderAt?: string;
}

export interface HearingInput {
  fileId: string;
  court: string;
  dateTime: string;
  lawyerId: string;
  agenda: string;
  reminderLeadHours?: number;
}

export interface ContactInput {
  kind: Contact['kind'];
  name: string;
  communication: string;
  referredBy?: string;
}

export interface DemoActions {
  resetDemo: () => void;
  setPersona: (personaId: string) => void;
  toggleOffline: () => void;
  advanceTime: (hours: number) => void;
  setDensity: (density: Density) => void;
  setTheme: (theme: Theme) => void;
  setNotificationPrefs: (patch: Partial<DemoData['settings']['notificationPrefs']>) => void;
  setTour: (active: boolean, step?: number) => void;
  setScreenState: (state: DemoData['settings']['screenState']) => void;
  markNotificationRead: (id: string) => void;
  stageMatch: (documentId: string, fileId: string) => void;
  markUnmatched: (documentId: string) => void;
  resolveDuplicate: (documentId: string, decision: 'ayni' | 'yeni_surum' | 'iliskisiz') => void;
  sendCandidateForApproval: (candidateId: string) => void;
  approveCandidate: (
    candidateId: string,
    reason: string,
    confirmed: boolean,
    correctedDate?: string,
  ) => void;
  rejectCandidate: (candidateId: string, reason: string) => void;
  requestCandidateExplanation: (candidateId: string, reason: string) => void;
  createPotential: (input: PotentialInput) => string;
  addManualDeadline: (
    fileId: string,
    kind: 'zamanasimi' | 'hak_dusurucu' | 'vekaletname_bitis',
    dueDate: string,
    basis: string,
    reason: string,
    confirmed: boolean,
  ) => void;
  convertPotential: (fileId: string, caseNumber: string, court: string) => void;
  completeDocumentInformation: (documentId: string, fee: string) => void;
  addDocumentVersion: (documentId: string, version: DocumentVersion) => void;
  submitDocumentForApproval: (documentId: string) => void;
  approveDocumentInternally: (documentId: string, reason: string, confirmed: boolean) => void;
  sendDocumentExternally: (documentId: string, reason: string, confirmed: boolean) => void;
  pinHearingOffline: (hearingId: string) => void;
  createHearing: (input: HearingInput) => { id: string; hasConflict: boolean };
  updateHearing: (hearingId: string, patch: Partial<HearingInput>) => { hasConflict: boolean };
  createManualTask: (input: ManualTaskInput) => string;
  completeTask: (taskId: string) => void;
  reopenTask: (taskId: string) => void;
  createContact: (input: ContactInput) => string;
  updateContact: (contactId: string, patch: Partial<ContactInput>) => void;
  createDemoUser: (name: string, role: Role, email?: string) => string;
  setUserRole: (userId: string, role: Role) => void;
  setUserActive: (userId: string, active: boolean) => void;
  completeVoiceNote: (voiceNoteId: string) => void;
  queueVoiceCandidates: (voiceNoteId: string) => void;
  setApprovalLevel: (operation: string, level: ApprovalLevel) => void;
  addLedgerEntry: (entry: Omit<LedgerEntry, 'id'>) => void;
  requestAccess: (fileId: string) => void;
  requestPrivateNotes: (fileId: string) => void;
  ingestDemoDocument: (
    channel: DemoData['incomingDocuments'][number]['channel'],
    note: string,
    scenario: 'normal' | 'ocr_hata' | 'guvenlik' | 'duplicate' | 'belirsiz',
  ) => string;
  createGeneratedDocument: (
    kind: DemoData['generatedDocuments'][number]['kind'],
    fileId: string,
    template: string,
  ) => string;
}

export type DemoStore = DemoData & DemoActions;

const withDraft = (
  set: (updater: (state: DemoStore) => DemoStore) => void,
  recipe: (draft: DemoStore) => void,
) => set((state) => produce(state, recipe));

type StoreSetter = Parameters<typeof withDraft>[0];

const allRoles: Role[] = ['yonetici_avukat', 'calisan_avukat', 'sekreter', 'stajyer'];
const operationalRoles: Role[] = ['yonetici_avukat', 'calisan_avukat', 'sekreter'];
const lawyerRoles: Role[] = ['yonetici_avukat', 'calisan_avukat'];

const actorFor = (data: DemoData): User => {
  const actor = data.users.find((user) => user.id === data.settings.personaId);
  if (!actor) throw new InvariantError('Aktif kullanıcı bulunamadı.');
  if (!actor.active) throw new InvariantError('Pasif persona işlem yapamaz.');
  return actor;
};

const guardedDraft = (
  set: StoreSetter,
  operation: string,
  objectType: string,
  recipe: (draft: DemoStore) => void,
) => {
  try {
    withDraft(set, recipe);
  } catch (error) {
    if (error instanceof InvariantError) {
      withDraft(set, (draft) => {
        appendDeniedAudit(draft, { operation, objectType });
      });
    }
    throw error;
  }
};

const assertCompleteLatestVersion = (document: DemoData['generatedDocuments'][number]) => {
  const latest = document.versions.at(-1);
  if (!latest || latest.fields.some((field) => !field.value?.trim())) {
    throw new InvariantError('Eksik bilgiler tamamlanmadan bu belge geçişi yapılamaz.');
  }
  return latest;
};

const normalizeName = (value: string) => value.trim().toLocaleLowerCase('tr-TR');

const hearingHasConflict = (
  hearings: Hearing[],
  lawyerId: string,
  dateTime: string,
  ignoredId?: string,
) => {
  const target = new Date(dateTime).getTime();
  return hearings.some(
    (hearing) =>
      hearing.id !== ignoredId &&
      hearing.lawyerId === lawyerId &&
      Math.abs(new Date(hearing.dateTime).getTime() - target) <= 2 * 3_600_000,
  );
};

const assertUserManagementOnline = (data: DemoData) => {
  if (data.settings.offline) {
    throw new InvariantError('Çevrimdışıyken persona ve rol yönetimi kilitlidir.');
  }
};

const defaultNotificationPrefs: DemoData['settings']['notificationPrefs'] = {
  taskReminderLeadDays: [1, 3, 7],
  hearingReminderLeadDays: [1, 3],
  muted: false,
};

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const migratePersistedState = (
  persistedState: unknown,
  _version: number,
): Partial<DemoData> => {
  // Zustand unwraps { state, version } before calling migrate, so this function receives state.
  if (!isRecord(persistedState)) return {};

  const migrated: UnknownRecord = { ...persistedState };
  if (Array.isArray(persistedState.users)) {
    migrated.users = persistedState.users.map((user) =>
      isRecord(user)
        ? { ...user, active: typeof user.active === 'boolean' ? user.active : true }
        : user,
    );
  }
  if (Array.isArray(persistedState.tasks)) {
    migrated.tasks = persistedState.tasks.map((task) =>
      isRecord(task) ? { ...task, origin: task.origin === 'manuel' ? 'manuel' : 'aday' } : task,
    );
  }
  if (isRecord(persistedState.settings)) {
    const notificationPrefs = isRecord(persistedState.settings.notificationPrefs)
      ? persistedState.settings.notificationPrefs
      : {};
    migrated.settings = {
      ...persistedState.settings,
      theme:
        persistedState.settings.theme === 'dark' || persistedState.settings.theme === 'light'
          ? persistedState.settings.theme
          : 'light',
      notificationPrefs: {
        ...defaultNotificationPrefs,
        ...notificationPrefs,
      },
    };
  }

  return migrated as Partial<DemoData>;
};

const arrayItemMatchesSeed = (seedItem: unknown, item: unknown): boolean => {
  if (isRecord(seedItem)) {
    return isRecord(item) && (typeof seedItem.id !== 'string' || typeof item.id === 'string');
  }
  return typeof item === typeof seedItem;
};

const mergeWithSeed = (seedValue: unknown, persistedValue: unknown): unknown => {
  if (Array.isArray(seedValue)) {
    if (!Array.isArray(persistedValue)) return seedValue;
    const seedItem = seedValue.find((item) => item !== null && item !== undefined);
    if (
      seedItem !== undefined &&
      !persistedValue.every((item) => arrayItemMatchesSeed(seedItem, item))
    ) {
      return seedValue;
    }
    if (isRecord(seedItem) && typeof seedItem.id === 'string') {
      return persistedValue.map((item) => {
        if (!isRecord(item) || typeof item.id !== 'string') return item;
        const matchingSeed = seedValue.find(
          (candidate) => isRecord(candidate) && candidate.id === item.id,
        );
        return matchingSeed ? mergeWithSeed(matchingSeed, item) : item;
      });
    }
    return persistedValue;
  }
  if (isRecord(seedValue)) {
    if (!isRecord(persistedValue)) return seedValue;
    return Object.fromEntries(
      Object.entries(seedValue).map(([key, value]) => [
        key,
        mergeWithSeed(value, persistedValue[key]),
      ]),
    );
  }
  if (typeof seedValue === 'function') return seedValue;
  return persistedValue !== null && typeof persistedValue === typeof seedValue
    ? persistedValue
    : seedValue;
};

const validRoles: Role[] = ['yonetici_avukat', 'calisan_avukat', 'sekreter', 'stajyer'];

const isUsableUser = (user: User): boolean =>
  typeof user.id === 'string' &&
  typeof user.name === 'string' &&
  typeof user.shortName === 'string' &&
  validRoles.includes(user.role) &&
  Array.isArray(user.authorizedFileIds) &&
  user.authorizedFileIds.every((fileId) => typeof fileId === 'string') &&
  typeof user.active === 'boolean';

export const mergePersistedState = (
  persistedState: unknown,
  currentState: DemoStore,
): DemoStore => {
  const persisted = migratePersistedState(persistedState, 2);
  const merged = mergeWithSeed(currentState, persisted) as DemoStore;
  const usableUsers = merged.users.filter(isUsableUser);

  merged.users = usableUsers.some((user) => user.active) ? usableUsers : currentState.users;
  if (!merged.users.some((user) => user.id === merged.settings.personaId && user.active)) {
    merged.settings.personaId =
      merged.users.find((user) => user.active)?.id ?? currentState.settings.personaId;
  }

  return merged;
};

const materializeTaskGraph = (
  draft: DemoStore,
  candidate: TaskCandidate,
  actor: User,
): { taskId: string; taskIds: string[] } => {
  const taskId = `gorev-${candidate.id}`;
  const subtaskIds =
    candidate.kind === 'gorev' ? [`${taskId}-belge`, `${taskId}-taslak`, `${taskId}-kontrol`] : [];
  const ownerId = candidate.suggestedOwnerId ?? actor.id;
  const base = {
    fileId: candidate.fileId,
    ownerId,
    startDate: draft.settings.simulatedNow.slice(0, 10),
    dueDate: candidate.suggestedDueDate,
    status: 'acik' as const,
    sourceCandidateId: candidate.id,
    origin: 'aday' as const,
  };
  const subtasks: Task[] =
    candidate.kind === 'gorev'
      ? [
          {
            ...base,
            id: subtaskIds[0],
            title: `${candidate.title} · Kaynak belgeleri hazırla`,
            dependentTaskIds: [],
            subtaskIds: [],
          },
          {
            ...base,
            id: subtaskIds[1],
            title: `${candidate.title} · Taslağı hazırla`,
            dependentTaskIds: [subtaskIds[0]],
            subtaskIds: [],
          },
          {
            ...base,
            id: subtaskIds[2],
            title: `${candidate.title} · Son kontrolü tamamla`,
            dependentTaskIds: [subtaskIds[1]],
            subtaskIds: [],
          },
        ]
      : [];
  draft.tasks.push(...subtasks, {
    ...base,
    id: taskId,
    title: candidate.title,
    dependentTaskIds: candidate.kind === 'gorev' ? [subtaskIds[2]] : [],
    subtaskIds,
  });
  return { taskId, taskIds: [taskId, ...subtaskIds] };
};

export const useStore = create<DemoStore>()(
  persist(
    (set, get) => ({
      ...makeSeed(),
      resetDemo: () => set(makeSeed()),
      setPersona: (personaId) =>
        guardedDraft(set, 'Demo personası değiştirme', 'demo', (draft) => {
          const next = draft.users.find((user) => user.id === personaId);
          if (!next) throw new InvariantError('Persona bulunamadı.');
          if (!next.active) throw new InvariantError('Pasif persona seçilemez.');
          assertUserManagementOnline(draft);
          const previous = draft.settings.personaId;
          appendAudit(draft, {
            action: 'Demo personası değiştirildi',
            objectType: 'demo',
            objectId: 'persona',
            previousValue: previous,
            nextValue: personaId,
            reason: 'Yetki davranışını göstermek için bilinçli demo ayarı.',
          });
          draft.settings.personaId = personaId;
        }),
      toggleOffline: () =>
        withDraft(set, (draft) => {
          const next = !draft.settings.offline;
          draft.settings.offline = next;
          appendAudit(draft, {
            action: 'Çevrimdışı simülasyonu değiştirildi',
            objectType: 'demo',
            objectId: 'offline',
            previousValue: String(!next),
            nextValue: String(next),
            reason: 'Demo kontrolü',
          });
        }),
      advanceTime: (hours) =>
        withDraft(set, (draft) => {
          const previous = draft.settings.simulatedNow;
          const next = new Date(new Date(previous).getTime() + hours * 3_600_000).toISOString();
          draft.settings.simulatedNow = next;
          appendAudit(draft, {
            action: 'Simüle saat ilerletildi',
            objectType: 'demo',
            objectId: 'clock',
            previousValue: previous,
            nextValue: next,
            reason: `${hours} saat ilerletildi; eskalasyon görünürlüğü simüle edildi.`,
          });
        }),
      setDensity: (density) =>
        withDraft(set, (draft) => {
          const previous = draft.settings.density;
          draft.settings.density = density;
          appendAudit(draft, {
            action: 'Görünüm yoğunluğu değiştirildi',
            objectType: 'ayar',
            objectId: 'density',
            previousValue: previous,
            nextValue: density,
          });
        }),
      setTheme: (theme) =>
        withDraft(set, (draft) => {
          if (theme !== 'light' && theme !== 'dark') {
            throw new InvariantError('Geçersiz tema seçimi.');
          }
          const previous = draft.settings.theme;
          draft.settings.theme = theme;
          appendAudit(draft, {
            action: 'Tema tercihi değiştirildi',
            objectType: 'ayar',
            objectId: 'theme',
            previousValue: previous,
            nextValue: theme,
          });
        }),
      setNotificationPrefs: (patch) =>
        withDraft(set, (draft) => {
          const next = { ...draft.settings.notificationPrefs, ...patch };
          if (
            [...next.taskReminderLeadDays, ...next.hearingReminderLeadDays].some(
              (day) => !Number.isFinite(day) || day <= 0,
            )
          ) {
            throw new InvariantError('Hatırlatma günleri pozitif olmalıdır.');
          }
          const previous = JSON.stringify(draft.settings.notificationPrefs);
          draft.settings.notificationPrefs = next;
          appendAudit(draft, {
            action: 'Bildirim tercihleri değiştirildi',
            objectType: 'ayar',
            objectId: 'notification-prefs',
            previousValue: previous,
            nextValue: JSON.stringify(next),
            reason: 'Yerel demo tercihi; gerçek kanal veya gönderim tetiklenmedi.',
          });
        }),
      setTour: (active, step = 0) =>
        withDraft(set, (draft) => {
          draft.settings.tourActive = active;
          draft.settings.tourStep = step;
          appendAudit(draft, {
            action: active ? 'Rehberli tur başlatıldı' : 'Rehberli tur kapatıldı',
            objectType: 'demo',
            objectId: 'tour',
            nextValue: active ? `adım-${step}` : 'kapalı',
          });
        }),
      setScreenState: (screenState) =>
        withDraft(set, (draft) => {
          const previous = draft.settings.screenState;
          draft.settings.screenState = screenState;
          appendAudit(draft, {
            action: 'Ekran durumu simülasyonu değiştirildi',
            objectType: 'demo',
            objectId: 'screen-state',
            previousValue: previous,
            nextValue: screenState,
          });
        }),
      markNotificationRead: (id) =>
        guardedDraft(set, 'Bildirim okundu işaretleme', 'bildirim', (draft) => {
          const actor = actorFor(draft);
          assertRoleAllowed(actor.role, allRoles, 'Bu bildirim işlemi için rol yetkin yok.');
          const notification = draft.notifications.find((item) => item.id === id);
          if (!notification) throw new InvariantError('Bildirim bulunamadı.');
          const fileIds = relatedFileIdsForObject(draft, notification.kind, notification.relatedId);
          if (
            fileIds.length &&
            !fileIds.some(
              (fileId) =>
                actor.authorizedFileIds.includes('*') || actor.authorizedFileIds.includes(fileId),
            )
          ) {
            throw new InvariantError('Bu bildirim için dosya erişimin yok.');
          }
          if (notification.read) return;
          notification.read = true;
          appendAudit(draft, {
            action: 'Güvenli bildirim okundu',
            objectType: 'bildirim',
            objectId: id,
            nextValue: 'okundu',
          });
        }),
      stageMatch: (documentId, fileId) =>
        guardedDraft(set, 'Evrak eşleşmesini onaya gönderme', 'evrak', (draft) => {
          const document = draft.incomingDocuments.find((item) => item.id === documentId);
          const actor = actorFor(draft);
          if (!document) throw new InvariantError('Evrak bulunamadı.');
          assertRoleAllowed(actor.role, operationalRoles, 'Evrak eşleştirme rol yetkin yok.');
          assertIncomingAccess(draft, actor, document);
          assertFileAccess(actor, fileId);
          assertStateTransition(
            document.status,
            ['inceleme_bekliyor', 'eslesmemis'],
            'Evrak eşleştirme',
          );
          if (document.securityStatus !== 'guvenli') {
            throw new InvariantError('Güvenlik kontrolü tamamlanmayan evrak eşleştirilemez.');
          }
          if (!document.matchCandidates.some((candidate) => candidate.fileId === fileId)) {
            throw new InvariantError('Seçilen dosya bu eşleşme adayları arasında değil.');
          }
          const previous = document.status;
          document.pendingFileId = fileId;
          document.status = draft.settings.offline ? 'inceleme_bekliyor' : 'onay_bekliyor';
          appendAudit(draft, {
            action: 'Eşleşme adayı kullanıcı tarafından seçildi',
            objectType: 'evrak',
            objectId: documentId,
            previousValue: previous,
            nextValue: draft.settings.offline
              ? 'Senkronizasyon bekliyor'
              : `Onay bekliyor · ${fileId}`,
            reason: 'Kullanıcı seçimi; kesin dosya bağlantısı değildir.',
          });
        }),
      markUnmatched: (documentId) =>
        guardedDraft(set, 'Evrakı eşleşmemiş kuyruğa alma', 'evrak', (draft) => {
          const document = draft.incomingDocuments.find((item) => item.id === documentId);
          if (!document) throw new InvariantError('Evrak bulunamadı.');
          const actor = actorFor(draft);
          assertRoleAllowed(actor.role, operationalRoles, 'Evrak triage rol yetkin yok.');
          assertIncomingAccess(draft, actor, document);
          assertStateTransition(
            document.status,
            ['inceleme_bekliyor', 'onay_bekliyor'],
            'Evrakı eşleşmemiş kuyruğa alma',
          );
          const previous = document.status;
          document.status = 'eslesmemis';
          document.pendingFileId = undefined;
          appendAudit(draft, {
            action: 'Evrak eşleşmemiş kuyruğa alındı',
            objectType: 'evrak',
            objectId: documentId,
            previousValue: previous,
            nextValue: 'eslesmemis',
            reason: 'Kullanıcı hiçbir dosyayı tahminle bağlamadı.',
          });
        }),
      resolveDuplicate: (documentId, decision) =>
        guardedDraft(set, 'Duplicate kararı', 'evrak', (draft) => {
          const document = draft.incomingDocuments.find((item) => item.id === documentId);
          if (!document?.duplicateOf) throw new InvariantError('Duplicate adayı bulunamadı.');
          const actor = actorFor(draft);
          assertRoleAllowed(actor.role, operationalRoles, 'Duplicate kararı için rol yetkin yok.');
          assertIncomingAccess(draft, actor, document);
          assertStateTransition(document.status, ['inceleme_bekliyor'], 'Duplicate kararı');
          if (document.duplicateDecision) {
            throw new InvariantError('Duplicate kararı daha önce verilmiş.');
          }
          document.duplicateDecision = decision;
          appendAudit(draft, {
            action: 'Duplicate kararı verildi',
            objectType: 'evrak',
            objectId: documentId,
            nextValue: decision,
            reason: 'Sistem otomatik silme yapmadı; açık kullanıcı kararı.',
          });
        }),
      sendCandidateForApproval: (candidateId) =>
        guardedDraft(set, 'Adayı onaya gönderme', 'aday', (draft) => {
          const candidate = draft.candidates.find((item) => item.id === candidateId);
          if (!candidate) throw new InvariantError('Aday bulunamadı.');
          const actor = actorFor(draft);
          assertRoleAllowed(actor.role, operationalRoles, 'Aday hazırlama rol yetkin yok.');
          assertFileAccess(actor, candidate.fileId);
          assertStateTransition(candidate.status, ['aday'], 'Adayı onaya gönderme');
          const previous = candidate.status;
          candidate.status = 'onay_bekliyor';
          appendAudit(draft, {
            action: 'Görev/süre adayı onaya gönderildi',
            objectType: 'aday',
            objectId: candidateId,
            previousValue: previous,
            nextValue: 'onay_bekliyor',
            reason: 'AI adayı kesinleşmeden avukat kuyruğuna gönderildi.',
          });
        }),
      approveCandidate: (candidateId, reason, confirmed, correctedDate) =>
        guardedDraft(set, 'Görev/süre adayını kesinleştirme', 'aday', (draft) => {
          const candidate = draft.candidates.find((item) => item.id === candidateId);
          if (!candidate) throw new InvariantError('Aday bulunamadı.');
          const actor = actorFor(draft);
          assertRoleAllowed(
            actor.role,
            lawyerRoles,
            'Aday kararı yalnız avukat tarafından verilebilir.',
          );
          assertFileAccess(actor, candidate.fileId);
          if (correctedDate) candidate.suggestedDueDate = correctedDate;
          assertCandidateCanBeConfirmed(candidate);
          assertFinalActionAllowed(draft, reason, confirmed);
          const previous = `${candidate.status} · ${candidate.suggestedDueDate ?? 'tarih yok'}`;
          candidate.status = correctedDate ? 'duzeltildi' : 'teyit';
          const file = draft.files.find((item) => item.id === candidate.fileId);
          if (!file) throw new InvariantError('Adayın dosyası bulunamadı.');
          const { taskId, taskIds } = materializeTaskGraph(draft, candidate, actor);
          file.taskIds.push(...taskIds);
          let deadlineId: string | undefined;
          if (candidate.kind === 'sure') {
            const dueDate = candidate.suggestedDueDate as string;
            deadlineId = `sure-${candidate.id}`;
            draft.deadlines.push({
              id: deadlineId,
              fileId: candidate.fileId,
              kind: 'usul',
              triggeringEvent: candidate.sourcePassage ?? candidate.audioRange ?? 'Kullanıcı adayı',
              dueDate,
              legalBasis: `${candidate.calculationExplanation} · Avukat gerekçesi: ${reason}`,
              manual: Boolean(correctedDate),
              alarmPattern: '7 / 3 / 1 gün',
              confirmedById: actor.id,
              confirmedAt: draft.settings.simulatedNow,
              sourceCandidateId: candidate.id,
            });
            file.deadlineIds.push(deadlineId);
          }
          appendAudit(draft, {
            action:
              candidate.kind === 'sure'
                ? correctedDate
                  ? 'Süre düzeltilip teyit edildi'
                  : 'Süre teyit edilip takvime işlendi'
                : 'Görev adayı teyit edilip görevlere işlendi',
            objectType: 'aday',
            objectId: candidateId,
            previousValue: previous,
            nextValue: `${candidate.status} · ${taskId}${deadlineId ? ` · ${deadlineId}` : ''}`,
            reason,
          });
        }),
      rejectCandidate: (candidateId, reason) =>
        guardedDraft(set, 'Görev/süre adayını reddetme', 'aday', (draft) => {
          if (!reason.trim()) throw new InvariantError('Ret gerekçesi zorunludur.');
          const candidate = draft.candidates.find((item) => item.id === candidateId);
          if (!candidate) throw new InvariantError('Aday bulunamadı.');
          const actor = actorFor(draft);
          assertRoleAllowed(
            actor.role,
            lawyerRoles,
            'Aday reddi yalnız avukat tarafından yapılabilir.',
          );
          assertFileAccess(actor, candidate.fileId);
          assertStateTransition(candidate.status, ['aday', 'onay_bekliyor'], 'Aday reddi');
          const previous = candidate.status;
          candidate.status = 'reddedildi';
          appendAudit(draft, {
            action: 'Görev/süre adayı reddedildi',
            objectType: 'aday',
            objectId: candidateId,
            previousValue: previous,
            nextValue: 'reddedildi',
            reason,
          });
        }),
      requestCandidateExplanation: (candidateId, reason) =>
        guardedDraft(set, 'Aday açıklaması isteme', 'aday', (draft) => {
          if (!reason.trim()) throw new InvariantError('Açıklama isteği için gerekçe zorunludur.');
          const candidate = draft.candidates.find((item) => item.id === candidateId);
          if (!candidate) throw new InvariantError('Aday bulunamadı.');
          const actor = actorFor(draft);
          assertRoleAllowed(
            actor.role,
            lawyerRoles,
            'Açıklama kararı yalnız avukat tarafından verilebilir.',
          );
          assertFileAccess(actor, candidate.fileId);
          assertStateTransition(candidate.status, ['aday', 'onay_bekliyor'], 'Açıklama isteme');
          const previous = candidate.status;
          candidate.status = 'onay_bekliyor';
          appendAudit(draft, {
            action: 'Aday için açıklama istendi',
            objectType: 'aday',
            objectId: candidateId,
            previousValue: previous,
            nextValue: 'onay_bekliyor · açıklama gerekli',
            reason,
          });
        }),
      createPotential: (input) => {
        const id = `dosya-pot-${String(get().files.length + 501)}`;
        guardedDraft(set, 'Potansiyel dosya oluşturma', 'dosya', (draft) => {
          const actor = actorFor(draft);
          assertRoleAllowed(
            actor.role,
            operationalRoles,
            'Potansiyel dosya oluşturma rol yetkin yok.',
          );
          const responsible = draft.users.find((user) => user.id === input.responsibleLawyerId);
          if (!responsible || !lawyerRoles.includes(responsible.role)) {
            throw new InvariantError('Geçerli bir sorumlu avukat seçilmelidir.');
          }
          if (!draft.contacts.some((contact) => contact.id === input.clientId)) {
            throw new InvariantError('Geçerli bir müvekkil veya aday kişi seçilmelidir.');
          }
          if (!input.name.trim() || !input.subject.trim() || !input.firstContact.trim()) {
            throw new InvariantError('Potansiyel dosyanın zorunlu alanları eksiksiz olmalıdır.');
          }
          draft.files.push({
            id,
            status: 'potansiyel',
            name: input.name,
            clientId: input.clientId,
            opposingPartyId: input.opposingPartyId,
            responsibleLawyerId: input.responsibleLawyerId,
            subject: input.subject,
            private: false,
            deadlineIds: [],
            taskIds: [],
            documentIds: [],
            incomingDocumentIds: [],
            notes: [`İlk temas: ${input.firstContact}`],
            privateNotes: [],
            missingDocuments: ['Kimlik/şirket kayıtları', 'Uyuşmazlığa dayanak belge'],
            timeline: [
              {
                id: `tl-${id}-1`,
                date: draft.settings.simulatedNow,
                title: draft.settings.offline
                  ? 'Potansiyel taslak oluşturuldu'
                  : 'Potansiyel dosya oluşturuldu',
                detail: draft.settings.offline
                  ? 'Senkronizasyon bekliyor; aktif dava değildir.'
                  : 'Mahkeme/esas bilgisi olmadan potansiyel statüde açıldı.',
              },
            ],
          });
          if (!actor.authorizedFileIds.includes('*')) actor.authorizedFileIds.push(id);
          appendAudit(draft, {
            action: 'Potansiyel dosya oluşturuldu',
            objectType: 'dosya',
            objectId: id,
            nextValue: draft.settings.offline
              ? 'potansiyel · senkronizasyon bekliyor'
              : 'potansiyel',
            reason: 'Mahkeme ve esas alanları isteğe bağlı bırakıldı.',
          });
        });
        return id;
      },
      addManualDeadline: (fileId, kind, dueDate, basis, reason, confirmed) =>
        guardedDraft(set, 'Manuel süre kesinleştirme', 'sure', (draft) => {
          if (!basis.trim()) throw new InvariantError('Manuel süre için dayanak/not zorunludur.');
          if (!dueDate || Number.isNaN(new Date(`${dueDate}T00:00:00Z`).getTime())) {
            throw new InvariantError('Manuel süre için geçerli bir son tarih zorunludur.');
          }
          const actor = actorFor(draft);
          const file = draft.files.find((item) => item.id === fileId);
          if (!file) throw new InvariantError('Dosya bulunamadı.');
          assertRoleAllowed(
            actor.role,
            lawyerRoles,
            'Manuel süre yalnız avukat tarafından girilebilir.',
          );
          assertFileAccess(actor, fileId);
          assertStateTransition(file.status, ['aktif', 'potansiyel'], 'Manuel süre ekleme');
          assertFinalActionAllowed(draft, reason, confirmed);
          const id = `sure-manuel-${draft.deadlines.length + 1}`;
          draft.deadlines.push({
            id,
            fileId,
            kind,
            triggeringEvent: 'Kullanıcı tarafından manuel girildi',
            dueDate,
            legalBasis: basis,
            manual: true,
            alarmPattern: '30 / 14 / 7 / 1 gün',
            confirmedById: actor.id,
            confirmedAt: draft.settings.simulatedNow,
          });
          file.deadlineIds.push(id);
          appendAudit(draft, {
            action: 'Manuel süre eklendi',
            objectType: 'sure',
            objectId: id,
            nextValue: `${kind} · ${dueDate}`,
            reason: `${basis} · Avukat gerekçesi: ${reason}`,
          });
        }),
      convertPotential: (fileId, caseNumber, court) =>
        guardedDraft(set, 'Potansiyel dosyayı aktife dönüştürme', 'dosya', (draft) => {
          const file = draft.files.find((item) => item.id === fileId);
          if (!file) throw new InvariantError('Potansiyel dosya bulunamadı.');
          const actor = actorFor(draft);
          assertFileAccess(actor, fileId);
          assertManagerLawyer(actor.role);
          assertStateTransition(file.status, ['potansiyel'], 'Aktif dosyaya dönüşüm');
          if (!caseNumber.trim() || !court.trim()) {
            throw new InvariantError('Dönüşüm için esas numarası ve mahkeme zorunludur.');
          }
          const previous = `${file.status} · mahkeme/esas yok`;
          file.status = 'aktif';
          file.caseNumber = caseNumber;
          file.court = court;
          file.convertedToId = file.id;
          file.timeline.push({
            id: `tl-${file.id}-convert`,
            date: draft.settings.simulatedNow,
            title: 'Aktif dosyaya dönüştürüldü',
            detail: 'Potansiyel geçmiş, belgeler ve süreler korunmuştur.',
          });
          appendAudit(draft, {
            action: 'Potansiyel aktif dosyaya dönüştürüldü',
            objectType: 'dosya',
            objectId: fileId,
            previousValue: previous,
            nextValue: `aktif · ${caseNumber} · ${court}`,
            reason: 'Dava açıldığı kullanıcı tarafından bildirildi.',
          });
        }),
      completeDocumentInformation: (documentId, fee) =>
        guardedDraft(set, 'Belge bilgisini tamamlama', 'belge', (draft) => {
          const document = draft.generatedDocuments.find((item) => item.id === documentId);
          if (!document) throw new InvariantError('Belge bulunamadı.');
          const actor = actorFor(draft);
          assertRoleAllowed(
            actor.role,
            operationalRoles,
            'Belge bilgisi düzenleme rol yetkin yok.',
          );
          assertFileAccess(actor, document.fileId);
          assertStateTransition(document.status, ['eksik_bilgi'], 'Belge bilgisi tamamlama');
          if (!fee.trim()) throw new InvariantError('Ücret alanı boş bırakılamaz.');
          const version = document.versions.at(-1);
          const field = version?.fields.find((item) => item.label === 'Ücret');
          if (!field) throw new InvariantError('Ücret alanı bulunamadı.');
          field.value = fee;
          assertCompleteLatestVersion(document);
          document.status = 'taslak';
          appendAudit(draft, {
            action: 'Eksik belge bilgisi tamamlandı',
            objectType: 'belge',
            objectId: documentId,
            nextValue: `Ücret: ${fee} · taslak`,
            reason: 'Rakam kullanıcı tarafından girildi; AI üretmedi.',
          });
        }),
      addDocumentVersion: (documentId, version) =>
        guardedDraft(set, 'Belge sürümü ekleme', 'belge', (draft) => {
          const document = draft.generatedDocuments.find((item) => item.id === documentId);
          if (!document) throw new InvariantError('Belge bulunamadı.');
          const actor = actorFor(draft);
          assertRoleAllowed(
            actor.role,
            lawyerRoles,
            'Belge sürümü yalnız avukat tarafından eklenebilir.',
          );
          assertFileAccess(actor, document.fileId);
          assertStateTransition(
            document.status,
            ['taslak', 'ic_onay_bekliyor', 'gonderime_hazir'],
            'Belge sürümü ekleme',
          );
          const previous = document.versions.at(-1)?.number ?? 0;
          if (
            version.number !== previous + 1 ||
            version.fields.some((field) => !field.value?.trim())
          ) {
            throw new InvariantError('Yeni sürüm sıralı ve eksiksiz olmalıdır.');
          }
          document.versions.push(version);
          document.status = 'ic_onay_bekliyor';
          document.internalApprovedAt = undefined;
          appendAudit(draft, {
            action: 'Yeni belge sürümü eklendi',
            objectType: 'belge',
            objectId: documentId,
            previousValue: `Sürüm ${previous}`,
            nextValue: `Sürüm ${version.number} · önceki onay geçersiz`,
            reason: 'Yeni sürüm eski metnin üzerine yazılmadı.',
          });
        }),
      submitDocumentForApproval: (documentId) =>
        guardedDraft(set, 'Belgeyi iç onaya gönderme', 'belge', (draft) => {
          const document = draft.generatedDocuments.find((item) => item.id === documentId);
          if (!document) throw new InvariantError('Belge bulunamadı.');
          const actor = actorFor(draft);
          assertRoleAllowed(actor.role, operationalRoles, 'Belge onay akışı rol yetkin yok.');
          assertFileAccess(actor, document.fileId);
          assertStateTransition(document.status, ['taslak'], 'Belgeyi iç onaya gönderme');
          assertCompleteLatestVersion(document);
          const previous = document.status;
          document.status = 'ic_onay_bekliyor';
          appendAudit(draft, {
            action: 'Belge iç onaya gönderildi',
            objectType: 'belge',
            objectId: documentId,
            previousValue: previous,
            nextValue: 'ic_onay_bekliyor',
          });
        }),
      approveDocumentInternally: (documentId, reason, confirmed) =>
        guardedDraft(set, 'Belge iç onayı', 'belge', (draft) => {
          const document = draft.generatedDocuments.find((item) => item.id === documentId);
          if (!document) throw new InvariantError('Belge bulunamadı.');
          const actor = actorFor(draft);
          assertFileAccess(actor, document.fileId);
          assertManagerLawyer(actor.role);
          assertStateTransition(document.status, ['ic_onay_bekliyor'], 'Belge iç onayı');
          assertCompleteLatestVersion(document);
          assertFinalActionAllowed(draft, reason, confirmed);
          const previous = document.status;
          document.status = 'gonderime_hazir';
          document.internalApprovedAt = draft.settings.simulatedNow;
          appendAudit(draft, {
            action: 'Belge iç onayı tamamlandı',
            objectType: 'belge',
            objectId: documentId,
            previousValue: previous,
            nextValue: 'gonderime_hazir · henüz gönderilmedi',
            reason,
          });
        }),
      sendDocumentExternally: (documentId, reason, confirmed) =>
        guardedDraft(set, 'Belge dış gönderimi', 'belge', (draft) => {
          const document = draft.generatedDocuments.find((item) => item.id === documentId);
          if (!document) throw new InvariantError('Belge bulunamadı.');
          const actor = actorFor(draft);
          assertFileAccess(actor, document.fileId);
          assertExternalSendAllowed(draft, document, reason, confirmed);
          document.status = 'gonderildi';
          document.sentAt = draft.settings.simulatedNow;
          appendAudit(draft, {
            action: 'Dış gönderim simüle edildi',
            objectType: 'belge',
            objectId: documentId,
            previousValue: 'gonderime_hazir',
            nextValue: 'gonderildi',
            reason: `${reason} · Demo içinde durum değişti; gerçek gönderim yapılmadı.`,
          });
        }),
      createManualTask: (input) => {
        const id = `gorev-manuel-${get().tasks.filter((task) => task.origin === 'manuel').length + 1}`;
        guardedDraft(set, 'Manuel görev oluşturma', 'gorev', (draft) => {
          const actor = actorFor(draft);
          const file = draft.files.find((item) => item.id === input.fileId);
          if (!file) throw new InvariantError('Görevin dosyası bulunamadı.');
          assertRoleAllowed(actor.role, operationalRoles, 'Manuel görev oluşturma rol yetkin yok.');
          assertFileAccess(actor, file.id);
          assertStateTransition(file.status, ['aktif', 'potansiyel'], 'Manuel görev oluşturma');
          if (!input.title.trim() || !input.startDate) {
            throw new InvariantError('Görev başlığı, dosya ve başlangıç tarihi zorunludur.');
          }
          const owner = draft.users.find((user) => user.id === input.ownerId && user.active);
          if (!owner) throw new InvariantError('Aktif görev sahibi bulunamadı.');
          if (input.reminderAt && Number.isNaN(new Date(input.reminderAt).getTime())) {
            throw new InvariantError('Hatırlatma zamanı geçerli değil.');
          }
          draft.tasks.push({
            id,
            fileId: file.id,
            title: input.title.trim(),
            ownerId: owner.id,
            startDate: input.startDate,
            dueDate: input.dueDate || undefined,
            reminderAt: input.reminderAt || undefined,
            status: 'acik',
            dependentTaskIds: [],
            subtaskIds: [],
            origin: 'manuel',
          });
          file.taskIds.push(id);
          if (input.reminderAt) {
            draft.notifications.push({
              id: `bild-${draft.notifications.length + 1}`,
              kind: 'gorev',
              safeTitle: 'Bir görev hatırlatması planlandı',
              relatedId: id,
              time: input.reminderAt,
              read: false,
            });
          }
          appendAudit(draft, {
            action: 'Manuel görev oluşturuldu',
            objectType: 'gorev',
            objectId: id,
            nextValue: draft.settings.offline ? 'acik · senkronizasyon bekliyor' : 'acik',
            reason: 'Kaynak kullanıcı; bu görev hukuki süre veya deadline değildir.',
          });
        });
        return id;
      },
      completeTask: (taskId) =>
        guardedDraft(set, 'Görevi tamamlama', 'gorev', (draft) => {
          const task = draft.tasks.find((item) => item.id === taskId);
          if (!task) throw new InvariantError('Görev bulunamadı.');
          const actor = actorFor(draft);
          assertRoleAllowed(actor.role, operationalRoles, 'Görev tamamlama rol yetkin yok.');
          assertFileAccess(actor, task.fileId);
          assertStateTransition(task.status, ['acik'], 'Görevi tamamlama');
          task.status = 'tamamlandi';
          task.completedAt = draft.settings.simulatedNow;
          appendAudit(draft, {
            action: 'Görev tamamlandı işaretlendi',
            objectType: 'gorev',
            objectId: task.id,
            previousValue: 'acik',
            nextValue: 'tamamlandi',
          });
        }),
      reopenTask: (taskId) =>
        guardedDraft(set, 'Görevi yeniden açma', 'gorev', (draft) => {
          const task = draft.tasks.find((item) => item.id === taskId);
          if (!task) throw new InvariantError('Görev bulunamadı.');
          const actor = actorFor(draft);
          assertRoleAllowed(actor.role, operationalRoles, 'Görev açma rol yetkin yok.');
          assertFileAccess(actor, task.fileId);
          assertStateTransition(task.status, ['tamamlandi'], 'Görevi yeniden açma');
          task.status = 'acik';
          task.completedAt = undefined;
          appendAudit(draft, {
            action: 'Görev yeniden açıldı',
            objectType: 'gorev',
            objectId: task.id,
            previousValue: 'tamamlandi',
            nextValue: 'acik',
          });
        }),
      createHearing: (input) => {
        const id = `durusma-${get().hearings.length + 1}`;
        let hasConflict = false;
        guardedDraft(set, 'Duruşma oluşturma', 'durusma', (draft) => {
          const actor = actorFor(draft);
          const file = draft.files.find((item) => item.id === input.fileId);
          if (!file) throw new InvariantError('Duruşmanın dosyası bulunamadı.');
          assertRoleAllowed(actor.role, operationalRoles, 'Duruşma oluşturma rol yetkin yok.');
          assertFileAccess(actor, file.id);
          assertStateTransition(file.status, ['aktif', 'potansiyel'], 'Duruşma oluşturma');
          if (!input.court.trim() || !input.dateTime || !input.agenda.trim()) {
            throw new InvariantError('Dosya, mahkeme, tarih-saat ve gündem zorunludur.');
          }
          const lawyer = draft.users.find(
            (user) => user.id === input.lawyerId && user.active && lawyerRoles.includes(user.role),
          );
          if (!lawyer) throw new InvariantError('Aktif duruşma avukatı bulunamadı.');
          if (Number.isNaN(new Date(input.dateTime).getTime())) {
            throw new InvariantError('Duruşma tarih-saat değeri geçerli değil.');
          }
          hasConflict = hearingHasConflict(draft.hearings, lawyer.id, input.dateTime);
          draft.hearings.push({
            id,
            fileId: file.id,
            court: input.court.trim(),
            dateTime: input.dateTime,
            lawyerId: lawyer.id,
            preparationStatus: 'eksik',
            agenda: input.agenda.trim(),
            lastAction: 'Kullanıcı tarafından oluşturulan sentetik takvim kaydı.',
            missingPreparation: [],
            voiceNoteIds: [],
            pinnedOffline: false,
            reminderLeadHours: input.reminderLeadHours,
          });
          if (input.reminderLeadHours) {
            draft.notifications.push({
              id: `bild-${draft.notifications.length + 1}`,
              kind: 'durusma',
              safeTitle: 'Bir duruşma hatırlatması planlandı',
              relatedId: id,
              time: input.dateTime,
              read: false,
            });
          }
          appendAudit(draft, {
            action: 'Duruşma oluşturuldu',
            objectType: 'durusma',
            objectId: id,
            nextValue: draft.settings.offline ? 'planlandı · senkronizasyon bekliyor' : 'planlandı',
            reason: hasConflict
              ? 'Yakın saat çakışması uyarıldı; sistem atama veya iptal yapmadı.'
              : 'Kullanıcı kaydı; otomatik görev veya süre üretilmedi.',
          });
        });
        return { id, hasConflict };
      },
      updateHearing: (hearingId, patch) => {
        let hasConflict = false;
        guardedDraft(set, 'Duruşma düzenleme', 'durusma', (draft) => {
          const hearing = draft.hearings.find((item) => item.id === hearingId);
          if (!hearing) throw new InvariantError('Duruşma bulunamadı.');
          const actor = actorFor(draft);
          assertRoleAllowed(actor.role, operationalRoles, 'Duruşma düzenleme rol yetkin yok.');
          assertFileAccess(actor, hearing.fileId);
          const fileId = patch.fileId ?? hearing.fileId;
          const file = draft.files.find((item) => item.id === fileId);
          if (!file) throw new InvariantError('Duruşmanın dosyası bulunamadı.');
          assertFileAccess(actor, fileId);
          assertStateTransition(file.status, ['aktif', 'potansiyel'], 'Duruşma düzenleme');
          const court = patch.court ?? hearing.court;
          const dateTime = patch.dateTime ?? hearing.dateTime;
          const agenda = patch.agenda ?? hearing.agenda;
          const lawyerId = patch.lawyerId ?? hearing.lawyerId;
          if (!court.trim() || !dateTime || !agenda.trim()) {
            throw new InvariantError('Dosya, mahkeme, tarih-saat ve gündem zorunludur.');
          }
          const lawyer = draft.users.find(
            (user) => user.id === lawyerId && user.active && lawyerRoles.includes(user.role),
          );
          if (!lawyer) throw new InvariantError('Aktif duruşma avukatı bulunamadı.');
          if (Number.isNaN(new Date(dateTime).getTime())) {
            throw new InvariantError('Duruşma tarih-saat değeri geçerli değil.');
          }
          hasConflict = hearingHasConflict(draft.hearings, lawyerId, dateTime, hearing.id);
          const previous = `${hearing.dateTime} · ${hearing.court}`;
          Object.assign(hearing, {
            ...patch,
            fileId,
            court: court.trim(),
            dateTime,
            agenda: agenda.trim(),
            lawyerId,
          });
          appendAudit(draft, {
            action: 'Duruşma düzenlendi',
            objectType: 'durusma',
            objectId: hearing.id,
            previousValue: previous,
            nextValue: `${dateTime} · ${court.trim()}${draft.settings.offline ? ' · senkronizasyon bekliyor' : ''}`,
            reason: hasConflict
              ? 'Yakın saat çakışması uyarıldı; sistem atama veya iptal yapmadı.'
              : 'Otomatik görev veya süre üretilmedi.',
          });
        });
        return { hasConflict };
      },
      createContact: (input) => {
        const slug =
          normalizeName(input.name)
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '') || 'kayit';
        const id = `kisi-${slug}-${get().contacts.length + 1}`;
        guardedDraft(set, 'Kişi oluşturma', 'kisi', (draft) => {
          const actor = actorFor(draft);
          assertRoleAllowed(actor.role, operationalRoles, 'Kişi oluşturma rol yetkin yok.');
          if (!input.name.trim()) throw new InvariantError('Kişi adı zorunludur.');
          if (
            input.referredBy &&
            !draft.contacts.some((contact) => contact.id === input.referredBy)
          ) {
            throw new InvariantError('Yönlendiren kişi bulunamadı.');
          }
          const conflictFlag = draft.contacts.some(
            (contact) =>
              contact.kind === 'karsi_taraf' &&
              normalizeName(contact.name) === normalizeName(input.name),
          );
          draft.contacts.push({
            id,
            kind: input.kind,
            name: input.name.trim(),
            communication: input.communication.trim(),
            referredBy: input.referredBy || undefined,
            conflictFlag,
          });
          appendAudit(draft, {
            action: 'Kişi oluşturuldu',
            objectType: 'kisi',
            objectId: id,
            nextValue: `${input.kind}${draft.settings.offline ? ' · senkronizasyon bekliyor' : ''}`,
            reason: conflictFlag
              ? 'Basit karşı taraf isim eşleşmesi uyarısı; otomatik birleştirme yapılmadı.'
              : 'Kullanıcı tarafından sentetik kişi kaydı oluşturuldu.',
          });
        });
        return id;
      },
      updateContact: (contactId, patch) =>
        guardedDraft(set, 'Kişi düzenleme', 'kisi', (draft) => {
          const contact = draft.contacts.find((item) => item.id === contactId);
          if (!contact) throw new InvariantError('Kişi bulunamadı.');
          const actor = actorFor(draft);
          assertRoleAllowed(actor.role, operationalRoles, 'Kişi düzenleme rol yetkin yok.');
          const relatedFiles = draft.files.filter(
            (file) => file.clientId === contact.id || file.opposingPartyId === contact.id,
          );
          if (relatedFiles.length) {
            if (
              !relatedFiles.some(
                (file) =>
                  actor.authorizedFileIds.includes('*') ||
                  actor.authorizedFileIds.includes(file.id),
              )
            ) {
              throw new InvariantError('Bu kişi kaydını düzenleme yetkin yok.');
            }
          } else if (!['yonetici_avukat', 'sekreter'].includes(actor.role)) {
            throw new InvariantError(
              'İlişkisiz kişi yalnız triage rolü tarafından düzenlenebilir.',
            );
          }
          const name = patch.name ?? contact.name;
          if (!name.trim()) throw new InvariantError('Kişi adı zorunludur.');
          if (patch.referredBy && !draft.contacts.some((item) => item.id === patch.referredBy)) {
            throw new InvariantError('Yönlendiren kişi bulunamadı.');
          }
          const previous = `${contact.kind} · ${contact.name} · ${contact.communication}`;
          const kind = patch.kind ?? contact.kind;
          const conflictFlag = draft.contacts.some(
            (item) =>
              item.id !== contact.id &&
              item.kind === 'karsi_taraf' &&
              normalizeName(item.name) === normalizeName(name),
          );
          Object.assign(contact, {
            ...patch,
            name: name.trim(),
            communication: (patch.communication ?? contact.communication).trim(),
            referredBy: patch.referredBy || undefined,
            kind,
            conflictFlag,
          });
          appendAudit(draft, {
            action: 'Kişi düzenlendi',
            objectType: 'kisi',
            objectId: contact.id,
            previousValue: previous,
            nextValue: `${kind} · ${name.trim()}${draft.settings.offline ? ' · senkronizasyon bekliyor' : ''}`,
            reason: conflictFlag
              ? 'Basit karşı taraf isim eşleşmesi uyarısı; otomatik birleştirme yapılmadı.'
              : 'Kullanıcı değişikliği.',
          });
        }),
      createDemoUser: (name, role, email) => {
        const id = `user-demo-${get().users.filter((user) => user.id.startsWith('user-demo-')).length + 1}`;
        guardedDraft(set, 'Sentetik persona oluşturma', 'kullanici', (draft) => {
          const actor = actorFor(draft);
          assertManagerLawyer(actor.role);
          assertUserManagementOnline(draft);
          if (!name.trim()) throw new InvariantError('Persona adı zorunludur.');
          if (!allRoles.includes(role)) throw new InvariantError('Geçersiz persona rolü.');
          const shortName = name
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map((part) => part[0]?.toLocaleUpperCase('tr-TR'))
            .join('');
          draft.users.push({
            id,
            name: name.trim(),
            shortName,
            role,
            authorizedFileIds: [],
            active: true,
            email: email?.trim() || undefined,
          });
          appendAudit(draft, {
            action: 'Sentetik persona oluşturuldu',
            objectType: 'kullanici',
            objectId: id,
            nextValue: `${role} · aktif · dosya yetkisi yok`,
            reason: 'Gerçek kimlik doğrulama, şifre veya oturum oluşturulmadı.',
          });
        });
        return id;
      },
      setUserRole: (userId, role) =>
        guardedDraft(set, 'Persona rolü değiştirme', 'kullanici', (draft) => {
          const actor = actorFor(draft);
          assertManagerLawyer(actor.role);
          assertUserManagementOnline(draft);
          if (!allRoles.includes(role)) throw new InvariantError('Geçersiz persona rolü.');
          const target = draft.users.find((user) => user.id === userId);
          if (!target) throw new InvariantError('Persona bulunamadı.');
          if (target.role === role) throw new InvariantError('Persona zaten bu rolde.');
          const activeManagers = draft.users.filter(
            (user) => user.active && user.role === 'yonetici_avukat',
          );
          if (
            target.active &&
            target.role === 'yonetici_avukat' &&
            role !== 'yonetici_avukat' &&
            activeManagers.length === 1
          ) {
            throw new InvariantError('Son aktif yönetici avukatın rolü düşürülemez.');
          }
          const previous = target.role;
          target.role = role;
          appendAudit(draft, {
            action: 'Persona rolü değiştirildi',
            objectType: 'kullanici',
            objectId: target.id,
            previousValue: previous,
            nextValue: role,
            reason: 'Sentetik yetki simülasyonu; gerçek auth değişikliği değildir.',
          });
        }),
      setUserActive: (userId, active) =>
        guardedDraft(set, 'Persona aktifliği değiştirme', 'kullanici', (draft) => {
          const actor = actorFor(draft);
          assertManagerLawyer(actor.role);
          assertUserManagementOnline(draft);
          const target = draft.users.find((user) => user.id === userId);
          if (!target) throw new InvariantError('Persona bulunamadı.');
          if (target.active === active) throw new InvariantError('Persona zaten bu durumda.');
          if (!active && target.id === actor.id) {
            throw new InvariantError('Aktif persona kendisini pasif yapamaz.');
          }
          const activeManagers = draft.users.filter(
            (user) => user.active && user.role === 'yonetici_avukat',
          );
          if (!active && target.role === 'yonetici_avukat' && activeManagers.length === 1) {
            throw new InvariantError('Son aktif yönetici avukat pasif yapılamaz.');
          }
          target.active = active;
          appendAudit(draft, {
            action: active ? 'Persona aktifleştirildi' : 'Persona pasifleştirildi',
            objectType: 'kullanici',
            objectId: target.id,
            previousValue: String(!active),
            nextValue: String(active),
            reason: 'Sentetik persona yaşam döngüsü; gerçek oturum veya hesap değildir.',
          });
        }),
      pinHearingOffline: (hearingId) =>
        guardedDraft(set, 'Duruşmayı çevrimdışı sabitleme', 'durusma', (draft) => {
          const hearing = draft.hearings.find((item) => item.id === hearingId);
          if (!hearing) throw new InvariantError('Duruşma bulunamadı.');
          const actor = actorFor(draft);
          assertRoleAllowed(actor.role, allRoles, 'Duruşma sabitleme rol yetkin yok.');
          assertFileAccess(actor, hearing.fileId);
          if (hearing.pinnedOffline) {
            throw new InvariantError('Duruşma özeti zaten çevrimdışı sabitlenmiş.');
          }
          hearing.pinnedOffline = true;
          appendAudit(draft, {
            action: 'Duruşma özeti çevrimdışı sabitlendi',
            objectType: 'durusma',
            objectId: hearingId,
            nextValue: 'özet ve sınırlı belge önbellekte',
          });
        }),
      completeVoiceNote: (voiceNoteId) =>
        guardedDraft(set, 'Sesli notu kaydetme', 'sesli_not', (draft) => {
          const note = draft.voiceNotes.find((item) => item.id === voiceNoteId);
          if (!note) throw new InvariantError('Sesli not bulunamadı.');
          const actor = actorFor(draft);
          assertRoleAllowed(
            actor.role,
            note.privacy === 'gizli' ? lawyerRoles : allRoles,
            'Bu sesli notu kaydetme rol yetkin yok.',
          );
          assertFileAccess(actor, note.fileId);
          assertStateTransition(note.status, ['taslak'], 'Sesli notu kaydetme');
          note.status = draft.settings.offline ? 'senkronizasyon_bekliyor' : 'kaydedildi';
          appendAudit(draft, {
            action: 'Sesli not kaydedildi',
            objectType: 'sesli_not',
            objectId: voiceNoteId,
            nextValue: note.status,
            reason: 'Orijinal ses ve metin taslağı ayrı tutulur; komut ifadeleri çalıştırılmaz.',
          });
        }),
      queueVoiceCandidates: (voiceNoteId) =>
        guardedDraft(set, 'Sesli not adaylarını onaya gönderme', 'sesli_not', (draft) => {
          const note = draft.voiceNotes.find((item) => item.id === voiceNoteId);
          if (!note) throw new InvariantError('Sesli not bulunamadı.');
          const actor = actorFor(draft);
          assertRoleAllowed(
            actor.role,
            operationalRoles,
            'Sesli not adaylarını hazırlama rol yetkin yok.',
          );
          assertFileAccess(actor, note.fileId);
          const candidates = note.taskCandidateIds.map((id) =>
            draft.candidates.find((item) => item.id === id),
          );
          if (candidates.some((candidate) => !candidate || candidate.fileId !== note.fileId)) {
            throw new InvariantError('Sesli not aday ilişkileri tutarsız.');
          }
          candidates.forEach((candidate) => {
            if (candidate)
              assertStateTransition(candidate.status, ['aday'], 'Sesli not adayını kuyruğa alma');
          });
          note.taskCandidateIds.forEach((id) => {
            const candidate = draft.candidates.find((item) => item.id === id);
            if (candidate) candidate.status = 'onay_bekliyor';
          });
          appendAudit(draft, {
            action: 'Sesli not adayları onay kuyruğuna gönderildi',
            objectType: 'sesli_not',
            objectId: voiceNoteId,
            nextValue: 'onay_bekliyor',
            reason: 'Ses içeriği doğrudan görev/takvim eylemi tetiklemedi.',
          });
        }),
      setApprovalLevel: (operation, level) =>
        guardedDraft(set, 'Onay seviyesi değiştirme', 'ayar', (draft) => {
          const actor = actorFor(draft);
          assertManagerLawyer(actor.role);
          if (!(operation in draft.settings.approvalLevels)) {
            throw new InvariantError('Bilinmeyen işlem için onay seviyesi değiştirilemez.');
          }
          const locked = ['Süreyi takvime yaz', 'Dış belge gönderimi', 'Feragat'];
          if (locked.includes(operation) && level !== 'tek') {
            throw new InvariantError('Bu yüksek riskli işlem tek tek onay seviyesinde kilitlidir.');
          }
          const previous = draft.settings.approvalLevels[operation];
          draft.settings.approvalLevels[operation] = level;
          appendAudit(draft, {
            action: 'Onay seviyesi bilinçli olarak değiştirildi',
            objectType: 'ayar',
            objectId: operation,
            previousValue: previous,
            nextValue: level,
            reason: 'Sistem seviyeyi kendiliğinden gevşetmedi.',
          });
        }),
      addLedgerEntry: (entry) =>
        guardedDraft(set, 'Cari kayıt ekleme', 'cari', (draft) => {
          const actor = actorFor(draft);
          assertManagerLawyer(actor.role);
          assertFileAccess(actor, entry.fileId);
          const file = draft.files.find((item) => item.id === entry.fileId);
          if (!file) throw new InvariantError('Cari kaydın dosyası bulunamadı.');
          assertStateTransition(file.status, ['aktif', 'potansiyel'], 'Cari kayıt ekleme');
          if (!entry.description.trim() || !Number.isFinite(entry.amount) || entry.amount <= 0) {
            throw new InvariantError('Cari kayıt açıklaması ve pozitif tutarı zorunludur.');
          }
          if (entry.approvalStatus !== 'onaylandi') {
            throw new InvariantError('Bu action yalnız yönetici onaylı cari kayıt oluşturur.');
          }
          const id = `cari-${draft.ledger.length + 1}`;
          draft.ledger.push({ ...entry, id });
          appendAudit(draft, {
            action: 'Manuel cari kayıt eklendi',
            objectType: 'cari',
            objectId: id,
            nextValue: `${entry.kind} · ${entry.amount} · ${entry.approvalStatus}`,
            reason: 'Banka/ödeme entegrasyonu yok; yalnız yerel fixture durumu.',
          });
        }),
      requestAccess: (fileId) =>
        withDraft(set, (draft) => {
          actorFor(draft);
          appendAudit(draft, {
            action: 'Yetkisiz erişim denemesi / yetki talebi',
            objectType: 'dosya',
            objectId: 'kisitli-hedef',
            nextValue: 'sorumlu avukata yönlendirildi',
            reason: `Hassas içerik ve hedef kimliği gösterilmedi; talep referansı ${fileId ? 'yerel olarak doğrulandı' : 'eksik'}.`,
          });
        }),
      requestPrivateNotes: (_fileId) =>
        withDraft(set, (draft) => {
          actorFor(draft);
          appendAudit(draft, {
            action: 'Gizli not erişim talebi oluşturuldu',
            objectType: 'gizli_not',
            objectId: 'kisitli-hedef',
            nextValue: 'sorumlu yönetici avukata yönlendirildi',
            reason: 'Gizli not içeriği ve hedef dosya kimliği audit kaydına yazılmadı.',
          });
        }),
      ingestDemoDocument: (channel, note, scenario) => {
        const id = `evrak-demo-${get().incomingDocuments.length + 1}`;
        guardedDraft(set, 'Sentetik evrak alma', 'evrak', (draft) => {
          const actor = actorFor(draft);
          assertRoleAllowed(actor.role, operationalRoles, 'Evrak alma rol yetkin yok.');
          if (!note.trim()) throw new InvariantError('Evrak bağlam notu zorunludur.');
          const templateId =
            scenario === 'ocr_hata'
              ? 'evrak-003'
              : scenario === 'duplicate'
                ? 'evrak-005'
                : scenario === 'belirsiz'
                  ? 'evrak-004'
                  : 'evrak-001';
          const template = draft.incomingDocuments.find((item) => item.id === templateId);
          if (!template) throw new InvariantError('Demo evrak fixture’ı bulunamadı.');
          if (scenario === 'belirsiz') {
            assertRoleAllowed(
              actor.role,
              ['yonetici_avukat', 'sekreter'],
              'İlişkisiz evrak yalnız yönetici avukat veya sekreter triage kuyruğuna alınabilir.',
            );
          } else {
            assertIncomingAccess(draft, actor, template);
          }
          draft.incomingDocuments.push({
            ...template,
            id,
            name: scenario === 'guvenlik' ? 'Parolali_Kurgu_Dosya.pdf' : `Yeni_${template.name}`,
            channel,
            receivedAt: draft.settings.simulatedNow,
            uploadedById: draft.settings.personaId,
            userNote: note,
            hash: `demo-sha256-${id}`,
            status: draft.settings.offline ? 'alindi' : 'inceleme_bekliyor',
            securityStatus: scenario === 'guvenlik' ? 'parolali' : template.securityStatus,
            matchCandidates: scenario === 'belirsiz' ? [] : template.matchCandidates,
            duplicateOf: scenario === 'duplicate' ? 'evrak-001' : undefined,
            duplicateDecision: undefined,
            pendingFileId: undefined,
          });
          appendAudit(draft, {
            action: 'Yeni sentetik evrak alındı',
            objectType: 'evrak',
            objectId: id,
            nextValue: draft.settings.offline ? 'Senkronizasyon bekliyor' : scenario,
            reason: `${channel} kanalı · ${note}`,
          });
        });
        return id;
      },
      createGeneratedDocument: (kind, fileId, template) => {
        const id = `belge-demo-${get().generatedDocuments.length + 1}`;
        guardedDraft(set, 'Belge taslağı oluşturma', 'belge', (draft) => {
          const actor = actorFor(draft);
          const file = draft.files.find((item) => item.id === fileId);
          if (!file) throw new InvariantError('Dosya bulunamadı.');
          assertRoleAllowed(
            actor.role,
            operationalRoles,
            'Belge taslağı oluşturma rol yetkin yok.',
          );
          assertFileAccess(actor, fileId);
          assertStateTransition(file.status, ['aktif', 'potansiyel'], 'Belge taslağı oluşturma');
          if (!draft.office.templates.includes(template)) {
            throw new InvariantError('Seçilen belge şablonu geçerli değil.');
          }
          const names = {
            teklif: 'Yeni Müvekkile Teklif Formu',
            sozlesme: 'Yeni Avukatlık Hizmet Sözleşmesi',
            dava_hazirlik: 'Yeni Dava Hazırlık Raporu',
          };
          draft.generatedDocuments.push({
            id,
            fileId,
            kind,
            name: names[kind],
            status: 'eksik_bilgi',
            versions: [
              {
                number: 1,
                createdAt: draft.settings.simulatedNow,
                sourceDescription: `${template} · yerel fixture`,
                fields: [
                  { label: 'Kapsam', value: file.subject, source: 'ai', critical: true },
                  { label: 'Ücret', source: 'kullanici', critical: true },
                  { label: 'Büro anteti', value: draft.office.letterhead, source: 'sablon' },
                  { label: 'Risk', value: 'Yetkili avukat tarafından tamamlanacak.', source: 'ai' },
                ],
              },
            ],
          });
          file.documentIds.push(id);
          appendAudit(draft, {
            action: 'Yeni belge taslağı oluşturuldu',
            objectType: 'belge',
            objectId: id,
            nextValue: 'eksik_bilgi',
            reason: 'Eksik ücret için rakam üretilmedi; dış gönderim kilitli.',
          });
        });
        return id;
      },
    }),
    {
      name: 'aterna-demo-state',
      version: 2,
      migrate: migratePersistedState,
      merge: mergePersistedState,
    },
  ),
);

export const roleLabel: Record<Role, string> = {
  yonetici_avukat: 'Yönetici avukat',
  calisan_avukat: 'Çalışan avukat',
  sekreter: 'Sekreter',
  stajyer: 'Stajyer',
};
