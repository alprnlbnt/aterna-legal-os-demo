import { FormEvent, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { UnauthorizedState } from '../components/states/States';
import { useActionFeedback } from '../lib/useActionFeedback';
import { canAccessFile, isLawyer } from '../store/invariants';
import { currentUser } from '../store/selectors';
import { useStore } from '../store/useStore';

export function HearingFormScreen({ calendarEntry = false }: { calendarEntry?: boolean }) {
  const store = useStore();
  const user = currentUser(store);
  const navigate = useNavigate();
  const { durusmaId } = useParams();
  const hearing = durusmaId ? store.hearings.find((item) => item.id === durusmaId) : undefined;
  const feedback = useActionFeedback();
  const files = store.files.filter(
    (file) => file.status !== 'kapali' && canAccessFile(user, file.id),
  );
  const lawyers = store.users.filter((candidate) => candidate.active && isLawyer(candidate.role));
  const [fileId, setFileId] = useState(hearing?.fileId ?? files[0]?.id ?? '');
  const [court, setCourt] = useState(hearing?.court ?? '');
  const [dateTime, setDateTime] = useState(
    hearing?.dateTime.slice(0, 16) ?? `${store.settings.simulatedNow.slice(0, 11)}09:00`,
  );
  const [lawyerId, setLawyerId] = useState(hearing?.lawyerId ?? lawyers[0]?.id ?? '');
  const [agenda, setAgenda] = useState(hearing?.agenda ?? '');
  const [reminderLeadHours, setReminderLeadHours] = useState(
    hearing?.reminderLeadHours ? String(hearing.reminderLeadHours) : '',
  );
  const normalizedDateTime = dateTime ? `${dateTime}:00Z` : '';
  const hasConflict = store.hearings.some(
    (item) =>
      item.id !== hearing?.id &&
      item.lawyerId === lawyerId &&
      normalizedDateTime &&
      Math.abs(new Date(item.dateTime).getTime() - new Date(normalizedDateTime).getTime()) <=
        2 * 3_600_000,
  );
  const isPast = Boolean(normalizedDateTime && normalizedDateTime < store.settings.simulatedNow);

  if (durusmaId && !hearing) {
    return (
      <div className="state-block">
        <div>
          <h1>Duruşma bulunamadı</h1>
          <Link className="button" to="/durusmalar">
            Listeye dön
          </Link>
        </div>
      </div>
    );
  }
  if (user.role === 'stajyer' || (hearing && !canAccessFile(user, hearing.fileId))) {
    return <UnauthorizedState />;
  }

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const input = {
      fileId,
      court,
      dateTime: normalizedDateTime,
      lawyerId,
      agenda,
      reminderLeadHours: reminderLeadHours ? Number(reminderLeadHours) : undefined,
    };
    if (hearing) {
      const result = feedback.run(
        () => store.updateHearing(hearing.id, input),
        'Duruşma güncellendi; otomatik görev veya süre üretilmedi.',
      );
      if (result) navigate(`/durusmalar/${hearing.id}`);
      return;
    }
    const result = feedback.run(
      () => store.createHearing(input),
      store.settings.offline
        ? 'Duruşma oluşturuldu; senkronizasyon bekliyor.'
        : 'Duruşma oluşturuldu.',
    );
    if (result) navigate(`/durusmalar/${result.id}`);
  };

  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <span className="eyebrow">
            {calendarEntry ? 'Takvim olayı' : 'Duruşma'} · Kullanıcı kaydı
          </span>
          <h1>{hearing ? 'Duruşmayı düzenle' : 'Duruşma oluştur'}</h1>
          <p>Bu kayıt otomatik hukuki süre veya görev üretmez; çakışma yalnız uyarılır.</p>
        </div>
        <Link
          className="button secondary"
          to={hearing ? `/durusmalar/${hearing.id}` : '/durusmalar'}
        >
          Vazgeç
        </Link>
      </header>
      <form className="card stack" onSubmit={submit} noValidate>
        <div className="grid-2">
          <label className="field">
            <span>Dosya</span>
            <select required value={fileId} onChange={(event) => setFileId(event.target.value)}>
              {files.map((file) => (
                <option value={file.id} key={file.id}>
                  {file.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Mahkeme</span>
            <input required value={court} onChange={(event) => setCourt(event.target.value)} />
          </label>
          <label className="field">
            <span>Tarih ve saat (UTC)</span>
            <input
              type="datetime-local"
              required
              value={dateTime}
              onChange={(event) => setDateTime(event.target.value)}
            />
          </label>
          <label className="field">
            <span>Duruşmaya girecek avukat</span>
            <select value={lawyerId} onChange={(event) => setLawyerId(event.target.value)}>
              {lawyers.map((lawyer) => (
                <option value={lawyer.id} key={lawyer.id}>
                  {lawyer.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Hatırlatma</span>
            <select
              value={reminderLeadHours}
              onChange={(event) => setReminderLeadHours(event.target.value)}
            >
              <option value="">Hatırlatma yok</option>
              <option value="24">1 gün önce</option>
              <option value="72">3 gün önce</option>
              <option value="168">7 gün önce</option>
            </select>
          </label>
        </div>
        <label className="field">
          <span>Gündem</span>
          <textarea required value={agenda} onChange={(event) => setAgenda(event.target.value)} />
        </label>
        {isPast && (
          <div className="notice warning" role="status">
            Seçilen tarih simüle saate göre geçmişte. Bu uyarı kaydı engellemez.
          </div>
        )}
        {hasConflict && (
          <div className="notice warning" role="status">
            Çakışma uyarısı: aynı avukatın ±2 saat içinde başka duruşması var. Sistem iptal veya
            yeniden atama yapmaz.
          </div>
        )}
        <button className="button" type="submit">
          {hearing ? 'Değişiklikleri kaydet' : 'Duruşmayı kaydet'}
        </button>
        {feedback.error && (
          <div className="notice danger" role="alert">
            {feedback.error}
          </div>
        )}
      </form>
    </div>
  );
}
