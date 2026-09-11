import {
  canAccessFile,
  canAccessIncomingDocument,
  canTriageUnrelatedIncoming,
  isDeadlineFinal,
  relatedFileIdsForObject,
} from './invariants';
import type {
  AuditEntry,
  CaseFile,
  Contact,
  DemoData,
  IncomingDocument,
  LedgerEntry,
  User,
} from './types';

export interface FinanceSummary {
  vekalet: number;
  tahsilat: number;
  kalanAlacak: number;
  gider: number;
  netNakit: number;
}

export interface LedgerFilters {
  year?: number | null;
  month?: number | null;
  dateFrom?: string;
  dateTo?: string;
  clientId?: string;
  kind?: LedgerEntry['kind'] | '';
  text?: string;
}

export interface AuditFilters {
  actorId?: string;
  objectType?: string;
  action?: string;
  dateFrom?: string;
  dateTo?: string;
  text?: string;
}

export interface MaskedCaseFile {
  id: string;
  status: CaseFile['status'];
  name: string;
  subject: string;
  masked: boolean;
}

export type VisibleCaseFile = Omit<CaseFile, 'privateNotes'>;

export const currentUser = (data: DemoData) =>
  data.users.find((user) => user.id === data.settings.personaId) ?? data.users[0];

export const selectVisibleFiles = (data: DemoData): (VisibleCaseFile | MaskedCaseFile)[] => {
  const user = currentUser(data);
  return data.files.map((file) => {
    if (canAccessFile(user, file.id)) {
      const { privateNotes, ...visibleFile } = file;
      void privateNotes;
      return visibleFile;
    }
    return {
      id: file.id,
      status: file.status,
      name: 'Kısıtlı dosya',
      subject: 'Bu içeriği görme yetkin yok',
      masked: true,
    };
  });
};

export const selectSensitiveCase = (data: DemoData, user: User, fileId: string) => {
  if (!canAccessFile(user, fileId)) return undefined;
  const file = data.files.find((item) => item.id === fileId);
  return file ? { ...file, privateNotes: [] } : undefined;
};

export const canViewPrivateNotes = (data: DemoData, user: User, fileId: string): boolean => {
  const file = data.files.find((item) => item.id === fileId);
  return Boolean(
    file &&
    canAccessFile(user, fileId) &&
    (user.role === 'yonetici_avukat' || file.responsibleLawyerId === user.id),
  );
};

export const selectPrivateNotes = (data: DemoData, user: User, fileId: string): string[] =>
  canViewPrivateNotes(data, user, fileId)
    ? [...(data.files.find((file) => file.id === fileId)?.privateNotes ?? [])]
    : [];

export const selectVisibleCandidates = (data: DemoData, user = currentUser(data)) =>
  data.candidates.filter((candidate) => canAccessFile(user, candidate.fileId));

export const selectVisibleIncoming = (
  data: DemoData,
  user = currentUser(data),
): IncomingDocument[] =>
  data.incomingDocuments
    .filter((document) => canAccessIncomingDocument(data, user, document))
    .map((document) => ({
      ...document,
      matchCandidates: document.matchCandidates.filter((candidate) =>
        canAccessFile(user, candidate.fileId),
      ),
      taskCandidateIds: document.taskCandidateIds.filter((candidateId) => {
        const candidate = data.candidates.find((item) => item.id === candidateId);
        return Boolean(candidate && canAccessFile(user, candidate.fileId));
      }),
      pendingFileId:
        document.pendingFileId && canAccessFile(user, document.pendingFileId)
          ? document.pendingFileId
          : undefined,
    }));

export const selectVisibleContacts = (data: DemoData, user = currentUser(data)): Contact[] =>
  data.contacts.filter((contact) => {
    const related = data.files.filter(
      (file) => file.clientId === contact.id || file.opposingPartyId === contact.id,
    );
    return related.length
      ? related.some((file) => canAccessFile(user, file.id))
      : canTriageUnrelatedIncoming(user.role);
  });

export const selectVisibleAudit = (data: DemoData, user = currentUser(data)): AuditEntry[] =>
  data.audit.filter((entry) => {
    const fileIds = relatedFileIdsForObject(data, entry.objectType, entry.objectId);
    if (fileIds.length) return fileIds.some((fileId) => canAccessFile(user, fileId));
    return entry.actorId === user.id || user.role === 'yonetici_avukat';
  });

export const selectVisibleNotifications = (data: DemoData, user = currentUser(data)) =>
  data.notifications.filter((notification) => {
    const fileIds = relatedFileIdsForObject(data, notification.kind, notification.relatedId);
    return fileIds.length === 0 || fileIds.some((fileId) => canAccessFile(user, fileId));
  });

export const selectFinalDeadlines = (data: DemoData) => data.deadlines.filter(isDeadlineFinal);

export const selectPendingCandidates = (data: DemoData) =>
  selectVisibleCandidates(data).filter(
    (candidate) => candidate.status === 'aday' || candidate.status === 'onay_bekliyor',
  );

export const selectBalance = (data: DemoData, fileId: string) =>
  data.ledger
    .filter((entry) => entry.fileId === fileId && entry.approvalStatus === 'onaylandi')
    .reduce(
      (total, entry) => total + (entry.direction === 'borc' ? entry.amount : -entry.amount),
      0,
    );

export const selectFinanceScope = (
  data: DemoData,
  user: User,
  scope: 'all' | string = 'all',
): LedgerEntry[] => {
  const visibleFileIds = new Set(
    data.files
      .filter(
        (file) =>
          file.status !== 'kapali' &&
          canAccessFile(user, file.id) &&
          (scope === 'all' || file.id === scope),
      )
      .map((file) => file.id),
  );
  return data.ledger.filter((entry) => visibleFileIds.has(entry.fileId));
};

export const selectFinanceSummary = (entries: LedgerEntry[]): FinanceSummary => {
  const approved = entries.filter((entry) => entry.approvalStatus === 'onaylandi');
  const sum = (kind: LedgerEntry['kind']) =>
    approved
      .filter((entry) => entry.kind === kind)
      .reduce((total, entry) => total + entry.amount, 0);
  const vekalet = sum('vekalet_ucreti');
  const tahsilat = sum('tahsilat');
  const gider = sum('masraf');
  const karsiYan = sum('karsi_yan_ucreti');
  return {
    vekalet,
    tahsilat,
    kalanAlacak: vekalet + karsiYan - tahsilat,
    gider,
    netNakit: tahsilat - gider,
  };
};

const monthKey = (value: string) => value.slice(0, 7);

export const selectMonthlyCollections = (
  entries: LedgerEntry[],
  now: string,
  count = 6,
): { key: string; label: string; total: number }[] => {
  const nowDate = new Date(now);
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.UTC(nowDate.getUTCFullYear(), nowDate.getUTCMonth() - index, 1));
    const key = date.toISOString().slice(0, 7);
    const label = new Intl.DateTimeFormat('tr-TR', {
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(date);
    const total = entries
      .filter(
        (entry) =>
          entry.approvalStatus === 'onaylandi' &&
          entry.kind === 'tahsilat' &&
          monthKey(entry.date) === key,
      )
      .reduce((sum, entry) => sum + entry.amount, 0);
    return { key, label, total };
  }).reverse();
};

const isInPeriod = (entry: LedgerEntry, period: Pick<LedgerFilters, 'year' | 'month'>): boolean => {
  if (!period.year) return true;
  const [year, month] = entry.date.split('-').map(Number);
  return year === period.year && (!period.month || month === period.month);
};

export const selectCashflow = (
  entries: LedgerEntry[],
  period: Pick<LedgerFilters, 'year' | 'month'>,
) => {
  const approved = entries.filter(
    (entry) => entry.approvalStatus === 'onaylandi' && isInPeriod(entry, period),
  );
  const gelen = approved
    .filter((entry) => entry.kind === 'tahsilat' || entry.kind === 'karsi_yan_ucreti')
    .reduce((sum, entry) => sum + entry.amount, 0);
  const giden = approved
    .filter((entry) => entry.kind === 'masraf' || entry.kind === 'vekalet_ucreti')
    .reduce((sum, entry) => sum + entry.amount, 0);
  return { gelen, giden, net: gelen - giden };
};

export const filterLedger = (
  entries: LedgerEntry[],
  files: CaseFile[],
  filters: LedgerFilters,
): LedgerEntry[] => {
  if (filters.dateFrom && filters.dateTo && filters.dateFrom > filters.dateTo) return [];
  const normalizedText = filters.text?.trim().toLocaleLowerCase('tr-TR') ?? '';
  return entries.filter((entry) => {
    const file = files.find((item) => item.id === entry.fileId);
    return (
      entry.approvalStatus === 'onaylandi' &&
      isInPeriod(entry, filters) &&
      (!filters.dateFrom || entry.date >= filters.dateFrom) &&
      (!filters.dateTo || entry.date <= filters.dateTo) &&
      (!filters.clientId || file?.clientId === filters.clientId) &&
      (!filters.kind || entry.kind === filters.kind) &&
      (!normalizedText || entry.description.toLocaleLowerCase('tr-TR').includes(normalizedText))
    );
  });
};

export const filterAudit = (audit: AuditEntry[], filters: AuditFilters): AuditEntry[] => {
  if (filters.dateFrom && filters.dateTo && filters.dateFrom > filters.dateTo) return [];
  const action = filters.action?.trim().toLocaleLowerCase('tr-TR') ?? '';
  const text = filters.text?.trim().toLocaleLowerCase('tr-TR') ?? '';
  return audit
    .filter((entry) => {
      const searchable = `${entry.action} ${entry.reason ?? ''} ${entry.nextValue ?? ''}`
        .toLocaleLowerCase('tr-TR')
        .trim();
      return (
        (!filters.actorId || entry.actorId === filters.actorId) &&
        (!filters.objectType || entry.objectType === filters.objectType) &&
        (!action || entry.action.toLocaleLowerCase('tr-TR').includes(action)) &&
        (!filters.dateFrom || entry.time.slice(0, 10) >= filters.dateFrom) &&
        (!filters.dateTo || entry.time.slice(0, 10) <= filters.dateTo) &&
        (!text || searchable.includes(text))
      );
    })
    .sort((left, right) => right.time.localeCompare(left.time));
};

export const paginate = <T>(list: T[], requestedPage: number, size = 20) => {
  const pageCount = Math.max(1, Math.ceil(list.length / size));
  const page = Math.min(pageCount, Math.max(1, Math.trunc(requestedPage) || 1));
  return {
    items: list.slice((page - 1) * size, page * size),
    page,
    pageCount,
    total: list.length,
  };
};
