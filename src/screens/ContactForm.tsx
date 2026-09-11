import { FormEvent, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { UnauthorizedState } from '../components/states/States';
import { useActionFeedback } from '../lib/useActionFeedback';
import { currentUser, selectVisibleContacts } from '../store/selectors';
import type { Contact } from '../store/types';
import { useStore } from '../store/useStore';

export function ContactFormScreen() {
  const store = useStore();
  const user = currentUser(store);
  const navigate = useNavigate();
  const { kisiId } = useParams();
  const existing = kisiId ? store.contacts.find((contact) => contact.id === kisiId) : undefined;
  const visible = selectVisibleContacts(store, user);
  const contact = kisiId ? visible.find((item) => item.id === kisiId) : undefined;
  const feedback = useActionFeedback();
  const [kind, setKind] = useState<Contact['kind']>(existing?.kind ?? 'muvekkil');
  const [name, setName] = useState(existing?.name ?? '');
  const [communication, setCommunication] = useState(existing?.communication ?? '');
  const [referredBy, setReferredBy] = useState(existing?.referredBy ?? '');
  const conflictWarning = store.contacts.some(
    (item) =>
      item.id !== existing?.id &&
      item.kind === 'karsi_taraf' &&
      item.name.trim().toLocaleLowerCase('tr-TR') === name.trim().toLocaleLowerCase('tr-TR') &&
      Boolean(name.trim()),
  );

  if (kisiId && !existing) {
    return (
      <div className="state-block">
        <div>
          <h1>Kişi bulunamadı</h1>
          <Link className="button" to="/kisiler">
            Kişilere dön
          </Link>
        </div>
      </div>
    );
  }
  if (user.role === 'stajyer' || (kisiId && !contact)) return <UnauthorizedState />;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (existing) {
      const result = feedback.run(() => {
        store.updateContact(existing.id, {
          kind,
          name,
          communication,
          referredBy: referredBy || undefined,
        });
        return true;
      }, 'Kişi kaydı güncellendi.');
      if (result) navigate(`/kisiler/${existing.id}`);
      return;
    }
    const id = feedback.run(
      () =>
        store.createContact({
          kind,
          name,
          communication,
          referredBy: referredBy || undefined,
        }),
      store.settings.offline ? 'Kişi oluşturuldu; senkronizasyon bekliyor.' : 'Kişi oluşturuldu.',
    );
    if (id) navigate(`/kisiler/${id}`);
  };

  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <span className="eyebrow">Sentetik kişi kaydı</span>
          <h1>{existing ? 'Kişiyi düzenle' : 'Kişi oluştur'}</h1>
          <p>İsim eşleşmesi yalnız uyarıdır; kişiler otomatik birleştirilmez.</p>
        </div>
        <Link className="button secondary" to={existing ? `/kisiler/${existing.id}` : '/kisiler'}>
          Vazgeç
        </Link>
      </header>
      <form className="card stack" onSubmit={submit} noValidate>
        <div className="grid-2">
          <label className="field">
            <span>Kişi türü</span>
            <select
              value={kind}
              onChange={(event) => setKind(event.target.value as Contact['kind'])}
            >
              <option value="muvekkil">Müvekkil</option>
              <option value="aday">Aday</option>
              <option value="karsi_taraf">Karşı taraf</option>
            </select>
          </label>
          <label className="field">
            <span>Ad / unvan</span>
            <input required value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label className="field">
            <span>İletişim</span>
            <input
              value={communication}
              onChange={(event) => setCommunication(event.target.value)}
            />
          </label>
          <label className="field">
            <span>Yönlendiren (isteğe bağlı)</span>
            <select value={referredBy} onChange={(event) => setReferredBy(event.target.value)}>
              <option value="">Yönlendiren yok</option>
              {visible
                .filter((item) => item.id !== existing?.id)
                .map((item) => (
                  <option value={item.id} key={item.id}>
                    {item.name}
                  </option>
                ))}
            </select>
          </label>
        </div>
        {conflictWarning && (
          <div className="notice warning" role="status">
            Benzer isimli karşı taraf kaydı var. Bu yalnız çıkar çatışması uyarısıdır; sistem hukuki
            karar vermez ve kayıtları birleştirmez.
          </div>
        )}
        <button className="button" type="submit">
          {existing ? 'Değişiklikleri kaydet' : 'Kişiyi kaydet'}
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
