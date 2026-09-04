import {
  canAccessFile,
  canAccessIncomingDocument,
  canTriageUnrelatedIncoming,
  isDeadlineFinal,
  relatedFileIdsForObject,
} from './invariants';
import type { AuditEntry, CaseFile, Contact, DemoData, IncomingDocument, User } from './types';

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
