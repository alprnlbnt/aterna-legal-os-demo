import type {
  DemoData,
  GeneratedDocument,
  IncomingDocument,
  Role,
  TaskCandidate,
  User,
} from './types';

export class InvariantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvariantError';
  }
}

export const isLawyer = (role: Role) => role === 'yonetici_avukat' || role === 'calisan_avukat';

export const canAccessFile = (user: User, fileId: string) =>
  user.authorizedFileIds.includes('*') || user.authorizedFileIds.includes(fileId);

export const inboxTriageRoles: Role[] = ['yonetici_avukat', 'sekreter'];

export const canTriageUnrelatedIncoming = (role: Role) => inboxTriageRoles.includes(role);

export function assertRoleAllowed(role: Role, allowed: Role[], message: string): void {
  if (!allowed.includes(role)) throw new InvariantError(message);
}

export function assertFileAccess(user: User, fileId: string): void {
  if (!canAccessFile(user, fileId)) {
    throw new InvariantError('Bu dosyayı görme yetkin yok. Deneme audit kaydına alınabilir.');
  }
}

export function assertLawyerDecision(role: Role): void {
  if (!isLawyer(role)) {
    throw new InvariantError('Bu karar en az bir yetkili avukatın onayını gerektirir.');
  }
}

export function assertManagerLawyer(role: Role): void {
  if (role !== 'yonetici_avukat') {
    throw new InvariantError('Bu işlem yalnız yönetici avukat tarafından yapılabilir.');
  }
}

export function assertStateTransition<T extends string>(
  current: T,
  allowedFrom: readonly T[],
  action: string,
): void {
  if (!allowedFrom.includes(current)) {
    throw new InvariantError(`${action} için kayıt mevcut durumda değiştirilemez.`);
  }
}

export function relatedFileIdsForIncoming(
  data: DemoData,
  document: IncomingDocument,
  visited = new Set<string>(),
): string[] {
  if (visited.has(document.id)) return [];
  visited.add(document.id);
  const ids = new Set<string>();
  document.matchCandidates.forEach((candidate) => ids.add(candidate.fileId));
  if (document.pendingFileId) ids.add(document.pendingFileId);
  data.files
    .filter((file) => file.incomingDocumentIds.includes(document.id))
    .forEach((file) => ids.add(file.id));
  document.taskCandidateIds.forEach((candidateId) => {
    const candidate = data.candidates.find((item) => item.id === candidateId);
    if (candidate) ids.add(candidate.fileId);
  });
  if (document.duplicateOf) {
    const original = data.incomingDocuments.find((item) => item.id === document.duplicateOf);
    if (original) {
      relatedFileIdsForIncoming(data, original, visited).forEach((fileId) => ids.add(fileId));
    }
  }
  return [...ids];
}

export function canAccessIncomingDocument(
  data: DemoData,
  user: User,
  document: IncomingDocument,
): boolean {
  const fileIds = relatedFileIdsForIncoming(data, document);
  return fileIds.length
    ? fileIds.some((fileId) => canAccessFile(user, fileId))
    : canTriageUnrelatedIncoming(user.role);
}

export function relatedFileIdsForObject(
  data: DemoData,
  objectType: string,
  objectId: string,
): string[] {
  if (objectType === 'dosya') {
    return data.files.some((file) => file.id === objectId) ? [objectId] : [];
  }
  const incoming = data.incomingDocuments.find((item) => item.id === objectId);
  if (incoming) return relatedFileIdsForIncoming(data, incoming);
  const direct = [
    ...data.candidates,
    ...data.tasks,
    ...data.deadlines,
    ...data.generatedDocuments,
    ...data.hearings,
    ...data.voiceNotes,
    ...data.ledger,
  ].find((item) => item.id === objectId);
  if (direct && 'fileId' in direct) return [direct.fileId];
  const notification = data.notifications.find((item) => item.id === objectId);
  if (notification) return relatedFileIdsForObject(data, notification.kind, notification.relatedId);
  return [];
}

export function assertIncomingAccess(data: DemoData, user: User, document: IncomingDocument): void {
  if (!canAccessIncomingDocument(data, user, document)) {
    throw new InvariantError('Bu evrak için görüntüleme veya triage yetkin yok.');
  }
}

export function assertFinalActionAllowed(data: DemoData, reason: string, confirmed: boolean): void {
  const actor = data.users.find((user) => user.id === data.settings.personaId);
  if (!actor) throw new InvariantError('Aktif persona bulunamadı.');
  assertLawyerDecision(actor.role);
  if (data.settings.offline) {
    throw new InvariantError('Çevrimdışıyken final onay verilemez; kayıt taslakta kalır.');
  }
  if (!reason.trim()) throw new InvariantError('Bu karar için gerekçe zorunludur.');
  if (!confirmed) throw new InvariantError('Kritik karar için ikinci doğrulama gereklidir.');
}

export function assertCandidateCanBeConfirmed(candidate: TaskCandidate): void {
  if (candidate.status !== 'onay_bekliyor' && candidate.status !== 'aday') {
    throw new InvariantError('Yalnız aday veya onay kuyruğundaki kayıt teyit edilebilir.');
  }
  if (candidate.kind === 'sure' && !candidate.suggestedDueDate) {
    throw new InvariantError('Son tarih seçilmeden süre kesinleştirilemez.');
  }
}

export function assertExternalSendAllowed(
  data: DemoData,
  document: GeneratedDocument,
  reason: string,
  confirmed: boolean,
): void {
  assertFinalActionAllowed(data, reason, confirmed);
  const actor = data.users.find((user) => user.id === data.settings.personaId);
  if (actor?.role !== 'yonetici_avukat') {
    throw new InvariantError('Dış gönderim yalnız yönetici/sorumlu avukat tarafından yapılabilir.');
  }
  if (document.status !== 'gonderime_hazir' || !document.internalApprovedAt) {
    throw new InvariantError('İç onay tamamlanmadan dış gönderim yapılamaz.');
  }
}

export const isDeadlineFinal = (deadline: { confirmedById?: string }) =>
  Boolean(deadline.confirmedById);

export const hasDefaultMatchSelection = (document: IncomingDocument) =>
  Boolean(document.pendingFileId) && document.status !== 'onay_bekliyor';

export const voiceCommandsArePassive = (text: string) => {
  const commands = ['sil', 'onayla', 'gönder'];
  return commands.filter((command) => text.toLocaleLowerCase('tr-TR').includes(command));
};
