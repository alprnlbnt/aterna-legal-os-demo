import type { Draft } from 'immer';
import type { AuditEntry, DemoData, Role } from './types';

export interface AuditInput {
  action: string;
  objectType: string;
  objectId: string;
  previousValue?: string;
  nextValue?: string;
  reason?: string;
}

export interface DeniedAuditInput {
  operation: string;
  objectType: string;
}

export function appendAudit(data: Draft<DemoData>, input: AuditInput): AuditEntry {
  const actor = data.users.find((user) => user.id === data.settings.personaId) ?? data.users[0];
  const entry: AuditEntry = {
    id: `audit-${String(data.audit.length + 1).padStart(4, '0')}`,
    time: data.settings.simulatedNow,
    actorId: actor.id,
    actorRole: actor.role as Role,
    ...input,
  };
  data.audit.push(entry);
  return entry;
}

export function appendDeniedAudit(data: Draft<DemoData>, input: DeniedAuditInput): AuditEntry {
  return appendAudit(data, {
    action: 'İşlem güvenlik politikasıyla reddedildi',
    objectType: input.objectType,
    objectId: 'kisitli-hedef',
    reason: `İşlem: ${input.operation}. Hedef kimliği, alan değerleri ve kullanıcı girdisi kaydedilmedi.`,
  });
}
