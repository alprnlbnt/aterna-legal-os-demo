import { beforeEach, describe, expect, it } from 'vitest';
import { makeSeed } from '../../fixtures/seed';
import {
  filterAudit,
  filterLedger,
  paginate,
  selectCashflow,
  selectFinanceSummary,
  selectMonthlyCollections,
} from '../../store/selectors';
import type { LedgerEntry } from '../../store/types';
import { mergePersistedState, migratePersistedState, useStore } from '../../store/useStore';

const ledger = (
  kind: LedgerEntry['kind'],
  amount: number,
  date = '2026-09-01',
  approvalStatus: LedgerEntry['approvalStatus'] = 'onaylandi',
): LedgerEntry => ({
  id: `${kind}-${amount}-${date}`,
  fileId: 'dosya-2024-118',
  date,
  kind,
  description: `${kind} kurgu kalemi`,
  amount,
  direction: kind === 'tahsilat' || kind === 'karsi_yan_ucreti' ? 'alacak' : 'borc',
  approvalStatus,
});

describe('back-office saf finans ve tablo yardımcıları', () => {
  it('özeti kind üzerinden ve yalnız onaylı kalemlerle hesaplar', () => {
    const summary = selectFinanceSummary([
      ledger('vekalet_ucreti', 100),
      ledger('karsi_yan_ucreti', 20),
      ledger('tahsilat', 70),
      ledger('masraf', 10),
      ledger('tahsilat', 999, '2026-09-02', 'taslak'),
    ]);
    expect(summary).toEqual({
      vekalet: 100,
      tahsilat: 70,
      kalanAlacak: 50,
      gider: 10,
      netNakit: 60,
    });
  });

  it('son altı ayı boş aylar dahil deterministik kovalar', () => {
    const months = selectMonthlyCollections(
      [ledger('tahsilat', 50, '2026-04-05'), ledger('tahsilat', 90, '2026-09-01')],
      '2026-09-03T08:15:00Z',
      6,
    );
    expect(months).toHaveLength(6);
    expect(months[0]).toMatchObject({ key: '2026-04', total: 50 });
    expect(months[1].total).toBe(0);
    expect(months[5]).toMatchObject({ key: '2026-09', total: 90 });
  });

  it('dönem nakit akışını kind semantiğiyle hesaplar', () => {
    expect(
      selectCashflow(
        [
          ledger('tahsilat', 100, '2026-09-01'),
          ledger('karsi_yan_ucreti', 20, '2026-09-02'),
          ledger('masraf', 15, '2026-09-03'),
          ledger('vekalet_ucreti', 30, '2026-09-04'),
          ledger('tahsilat', 500, '2026-08-01'),
        ],
        { year: 2026, month: 9 },
      ),
    ).toEqual({ gelen: 120, giden: 45, net: 75 });
  });

  it('ledger ve audit filtrelerinde geçersiz aralığı boş döndürür, sayfayı clamp eder', () => {
    const seed = makeSeed();
    expect(
      filterLedger(seed.ledger, seed.files, { dateFrom: '2026-09-10', dateTo: '2026-09-01' }),
    ).toEqual([]);
    expect(
      filterLedger(seed.ledger, seed.files, { clientId: 'kisi-metal', text: 'nisan' }),
    ).toHaveLength(1);
    expect(filterAudit(seed.audit, { actorId: 'user-nur', text: 'evrak' })).toHaveLength(1);
    expect(filterAudit(seed.audit, { dateFrom: '2026-09-03', dateTo: '2026-09-01' })).toEqual([]);
    expect(paginate([1, 2, 3], 99, 2)).toMatchObject({ items: [3], page: 2, pageCount: 2 });
    expect(paginate([], -4, 20)).toMatchObject({ items: [], page: 1, pageCount: 1 });
  });
});

describe('back-office store guardları ve migration', () => {
  beforeEach(() => {
    useStore.getState().resetDemo();
  });

  it('v1 state alanlarını v2 varsayılanlarıyla backfill eder', () => {
    const v1 = makeSeed();
    const legacy = {
      ...v1,
      users: v1.users.map(({ active: _active, ...user }) => user),
      tasks: v1.tasks.map(({ origin: _origin, ...task }) => task),
      settings: {
        ...v1.settings,
        theme: undefined,
        notificationPrefs: undefined,
      },
    };
    const migrated = migratePersistedState(legacy, 1);
    expect(migrated.users?.every((user) => user.active)).toBe(true);
    expect(migrated.tasks?.every((task) => task.origin === 'aday')).toBe(true);
    expect(migrated.settings?.theme).toBe('light');
    expect(migrated.settings?.notificationPrefs).toEqual({
      taskReminderLeadDays: [1, 3, 7],
      hearingReminderLeadDays: [1, 3],
      muted: false,
    });
  });

  it('boş hydration sonucunda tam seed ve store aksiyonlarını korur', () => {
    const current = useStore.getState();
    const merged = mergePersistedState(undefined, current);

    expect(merged.users).toEqual(current.users);
    expect(merged.settings).toEqual(current.settings);
    expect(merged.ledger).toEqual(current.ledger);
    expect(merged.resetDemo).toBe(current.resetDemo);
  });

  it('gerçek Zustand v1 envelope state alanını seed ile güvenli derin birleştirir', () => {
    const v1 = makeSeed();
    const envelope = {
      version: 1,
      state: {
        users: v1.users.slice(0, 4).map(({ active: _active, ...user }) => user),
        tasks: v1.tasks.map(({ origin: _origin, ...task }) => task),
        settings: {
          personaId: 'user-nur',
          offline: true,
          notificationPrefs: { muted: true },
        },
      },
    };
    const migrated = migratePersistedState(envelope.state, envelope.version);
    const merged = mergePersistedState(migrated, useStore.getState());

    expect(merged.users).toHaveLength(4);
    expect(merged.users.every((user) => user.active)).toBe(true);
    expect(merged.tasks.every((task) => task.origin === 'aday')).toBe(true);
    expect(merged.settings).toMatchObject({
      personaId: 'user-nur',
      offline: true,
      density: 'ferah',
      theme: 'light',
      notificationPrefs: {
        taskReminderLeadDays: [1, 3, 7],
        hearingReminderLeadDays: [1, 3],
        muted: true,
      },
    });
    expect(merged.ledger).toEqual(v1.ledger);
  });

  it('bozuk persisted alanları seed ile değiştirir ve kayıp personayı onarır', () => {
    const current = useStore.getState();
    const merged = mergePersistedState(
      {
        users: [],
        ledger: 'geçersiz',
        settings: {
          personaId: 'olmayan-persona',
          notificationPrefs: {
            taskReminderLeadDays: 'geçersiz',
          },
        },
      },
      current,
    );

    expect(merged.users).toEqual(current.users);
    expect(merged.ledger).toEqual(current.ledger);
    expect(merged.settings.personaId).toBe('user-alper');
    expect(merged.settings.notificationPrefs.taskReminderLeadDays).toEqual([1, 3, 7]);
  });

  it('manuel görev oluşturur ve tamamlar ama deadline üretmez', () => {
    const beforeDeadlines = useStore.getState().deadlines.length;
    const id = useStore.getState().createManualTask({
      fileId: 'dosya-2024-118',
      title: 'Kurgu manuel takip',
      ownerId: 'user-alper',
      startDate: '2026-09-03',
      dueDate: '2026-09-09',
      reminderAt: '2026-09-08T08:00:00Z',
    });
    expect(useStore.getState().tasks.find((task) => task.id === id)).toMatchObject({
      origin: 'manuel',
      status: 'acik',
    });
    expect(useStore.getState().deadlines).toHaveLength(beforeDeadlines);
    useStore.getState().completeTask(id);
    expect(useStore.getState().tasks.find((task) => task.id === id)).toMatchObject({
      status: 'tamamlandi',
      completedAt: '2026-09-03T08:15:00Z',
    });
  });

  it('duruşma oluştururken çakışmayı uyarır ama görev ve süre üretmez', () => {
    const beforeTasks = useStore.getState().tasks.length;
    const beforeDeadlines = useStore.getState().deadlines.length;
    const result = useStore.getState().createHearing({
      fileId: 'dosya-2024-118',
      court: 'Kurgu Ek Mahkeme',
      dateTime: '2026-09-03T11:00:00Z',
      lawyerId: 'user-alper',
      agenda: 'Kurgu çakışma testi',
      reminderLeadHours: 24,
    });
    expect(result.hasConflict).toBe(true);
    expect(useStore.getState().hearings.find((hearing) => hearing.id === result.id)).toBeDefined();
    expect(useStore.getState().tasks).toHaveLength(beforeTasks);
    expect(useStore.getState().deadlines).toHaveLength(beforeDeadlines);
  });

  it('pasif persona seçimini ve son aktif yöneticinin düşürülmesini reddeder', () => {
    expect(() => useStore.getState().setPersona('user-pasif')).toThrow('Pasif persona');
    expect(() => useStore.getState().setUserActive('user-alper', false)).toThrow('kendisini pasif');
    expect(() => useStore.getState().setUserRole('user-alper', 'calisan_avukat')).toThrow(
      'Son aktif yönetici',
    );
  });

  it('yeni persona dosya yetkisi olmadan başlar', () => {
    const id = useStore.getState().createDemoUser('Kurgu Yeni Persona', 'sekreter');
    expect(useStore.getState().users.find((user) => user.id === id)).toMatchObject({
      authorizedFileIds: [],
      active: true,
    });
  });

  it('karşı taraf isim eşleşmesini uyarır ve kişileri birleştirmez', () => {
    const before = useStore.getState().contacts.length;
    const id = useStore.getState().createContact({
      kind: 'aday',
      name: 'Karşı Taraf X (Kurgu)',
      communication: 'yalnız test',
    });
    expect(useStore.getState().contacts).toHaveLength(before + 1);
    expect(useStore.getState().contacts.find((contact) => contact.id === id)?.conflictFlag).toBe(
      true,
    );
  });
});
