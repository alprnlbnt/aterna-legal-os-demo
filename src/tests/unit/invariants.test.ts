import { makeSeed } from '../../fixtures/seed';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  assertExternalSendAllowed,
  assertFinalActionAllowed,
  hasDefaultMatchSelection,
  InvariantError,
  isDeadlineFinal,
  voiceCommandsArePassive,
} from '../../store/invariants';
import {
  canViewPrivateNotes,
  selectPrivateNotes,
  selectSensitiveCase,
  selectVisibleFiles,
} from '../../store/selectors';
import { useStore } from '../../store/useStore';

describe('Aterna değişmez ürün kuralları', () => {
  beforeEach(() => {
    useStore.getState().resetDemo();
  });

  it('AI adayını kendiliğinden teyit etmez', () => {
    const data = makeSeed();
    expect(data.candidates.find((item) => item.id === 'aday-sure-001')?.status).toBe('aday');
    expect(data.deadlines.some((item) => item.sourceCandidateId === 'aday-sure-001')).toBe(false);
  });

  it('yalnız teyit eden avukatı bulunan süreyi kesin sayar', () => {
    expect(isDeadlineFinal({})).toBe(false);
    expect(isDeadlineFinal({ confirmedById: 'user-alper' })).toBe(true);
  });

  it('birden fazla eşleşme adayında varsayılan seçim tutmaz', () => {
    const document = makeSeed().incomingDocuments.find((item) => item.id === 'evrak-001');
    expect(document?.matchCandidates).toHaveLength(2);
    expect(document && hasDefaultMatchSelection(document)).toBe(false);
    expect(document?.pendingFileId).toBeUndefined();
  });

  it('çevrimdışıyken final onayı reddeder', () => {
    const data = makeSeed();
    data.settings.offline = true;
    expect(() => assertFinalActionAllowed(data, 'Kaynak kontrol edildi', true)).toThrow(
      InvariantError,
    );
  });

  it('yetkisiz personaya hassas dosyayı döndürmez ve listede maskeler', () => {
    const data = makeSeed();
    data.settings.personaId = 'user-ada';
    const intern = data.users.find((user) => user.id === 'user-ada');
    expect(intern && selectSensitiveCase(data, intern, 'dosya-2024-118')).toBeUndefined();
    const masked = selectVisibleFiles(data).find((file) => file.id === 'dosya-2024-118');
    expect(masked?.name).toBe('Kısıtlı dosya');
    expect(JSON.stringify(masked)).not.toContain('Kurgu Metal');
  });

  it('dosya listesinde yetkili kullanıcıya da privateNotes alanını döndürmez', () => {
    const visible = selectVisibleFiles(makeSeed()).find((file) => file.id === 'dosya-2024-118');
    expect(visible).toBeDefined();
    expect(visible).not.toHaveProperty('privateNotes');
  });

  it.each([
    ['çalışan avukat', 'user-deniz', 'dosya-2024-118'],
    ['sekreter', 'user-nur', 'dosya-2024-118'],
    ['stajyer', 'user-ada', 'dosya-2023-71'],
  ])('%s gizli notları göremez', (_role, userId, fileId) => {
    const data = makeSeed();
    const file = data.files.find((item) => item.id === fileId)!;
    file.privateNotes = ['Görünmemesi gereken test notu.'];
    const user = data.users.find((item) => item.id === userId)!;
    expect(canViewPrivateNotes(data, user, fileId)).toBe(false);
    expect(selectPrivateNotes(data, user, fileId)).toEqual([]);
  });

  it('gizli notları yalnız erişimi olan sorumlu veya yönetici avukata döndürür', () => {
    const data = makeSeed();
    const file = data.files.find((item) => item.id === 'dosya-2023-71')!;
    file.privateNotes = ['Kontrollü test notu.'];
    const responsible = data.users.find((item) => item.id === 'user-deniz')!;
    const manager = data.users.find((item) => item.id === 'user-alper')!;
    responsible.authorizedFileIds.push(file.id);
    expect(selectPrivateNotes(data, responsible, file.id)).toEqual(['Kontrollü test notu.']);
    expect(selectPrivateNotes(data, manager, file.id)).toEqual(['Kontrollü test notu.']);
  });

  it('yüksek riskli mutasyonda bir audit ekler ve eski audit satırlarını değiştirmez', () => {
    const before = structuredClone(useStore.getState().audit);
    const beforeLength = before.length;
    useStore
      .getState()
      .approveCandidate(
        'aday-sure-001',
        'Orijinal belge ve olay tarihi avukatça kontrol edildi.',
        true,
        '2026-09-16',
      );
    const after = useStore.getState().audit;
    expect(after).toHaveLength(beforeLength + 1);
    expect(after.slice(0, beforeLength)).toEqual(before);
    expect(
      useStore.getState().deadlines.find((item) => item.sourceCandidateId === 'aday-sure-001')
        ?.confirmedById,
    ).toBe('user-alper');
  });

  it('süre teyidinde ana görev ve deadline üretir, alt görev üretmez', () => {
    useStore
      .getState()
      .approveCandidate(
        'aday-sure-001',
        'Orijinal belge ve olay tarihi avukatça kontrol edildi.',
        true,
        '2026-09-16',
      );
    const state = useStore.getState();
    const materializedTasks = state.tasks.filter(
      (task) => task.sourceCandidateId === 'aday-sure-001',
    );
    expect(materializedTasks).toHaveLength(1);
    expect(materializedTasks[0]).toMatchObject({
      id: 'gorev-aday-sure-001',
      dependentTaskIds: [],
      subtaskIds: [],
    });
    expect(
      state.deadlines.find((deadline) => deadline.sourceCandidateId === 'aday-sure-001'),
    ).toMatchObject({ id: 'sure-aday-sure-001', confirmedById: 'user-alper' });
    expect(state.files.find((file) => file.id === 'dosya-2024-118')?.taskIds).toContain(
      'gorev-aday-sure-001',
    );
  });

  it('görev teyidinde ana görev ve üç bağlı alt görev zincirini korur', () => {
    useStore
      .getState()
      .approveCandidate('aday-ses-001', 'Ses kaydı ve görev kapsamı kontrol edildi.', true);
    const state = useStore.getState();
    const taskId = 'gorev-aday-ses-001';
    const subtaskIds = [`${taskId}-belge`, `${taskId}-taslak`, `${taskId}-kontrol`];
    const mainTask = state.tasks.find((task) => task.id === taskId);
    expect(mainTask).toMatchObject({
      dependentTaskIds: [subtaskIds[2]],
      subtaskIds,
    });
    expect(state.tasks.find((task) => task.id === subtaskIds[0])?.dependentTaskIds).toEqual([]);
    expect(state.tasks.find((task) => task.id === subtaskIds[1])?.dependentTaskIds).toEqual([
      subtaskIds[0],
    ]);
    expect(state.tasks.find((task) => task.id === subtaskIds[2])?.dependentTaskIds).toEqual([
      subtaskIds[1],
    ]);
    expect(state.deadlines.some((deadline) => deadline.sourceCandidateId === 'aday-ses-001')).toBe(
      false,
    );
    expect(state.files.find((file) => file.id === 'dosya-2024-118')?.taskIds).toEqual(
      expect.arrayContaining([taskId, ...subtaskIds]),
    );
  });

  it('iç onay olmadan dış gönderime izin vermez', () => {
    const data = makeSeed();
    const document = data.generatedDocuments.find((item) => item.id === 'belge-sozlesme-1');
    expect(document).toBeDefined();
    expect(
      () => document && assertExternalSendAllowed(data, document, 'Kontrol edildi', true),
    ).toThrow('İç onay');
  });

  it('sesli nottaki komut ifadelerini yalnız pasif metin olarak bulur', () => {
    const text = makeSeed().voiceNotes[0].transcriptDraft;
    expect(voiceCommandsArePassive(text)).toEqual(['sil', 'gönder']);
    const beforeTasks = useStore.getState().tasks.length;
    useStore.getState().completeVoiceNote('ses-118');
    expect(useStore.getState().tasks).toHaveLength(beforeTasks);
  });

  it('offline action store üzerinden de kesin süre oluşturmaz', () => {
    useStore.getState().toggleOffline();
    const deadlinesBefore = useStore.getState().deadlines.length;
    expect(() =>
      useStore.getState().approveCandidate('aday-sure-002', 'Kaynak kontrol edildi', true),
    ).toThrow('Çevrimdışıyken');
    expect(useStore.getState().deadlines).toHaveLength(deadlinesBefore);
  });
});
