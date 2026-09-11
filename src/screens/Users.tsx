import { FormEvent, useState } from 'react';
import { StatusBadge } from '../components/forms/StatusBadge';
import { SuccessToast, UnauthorizedState } from '../components/states/States';
import { useActionFeedback } from '../lib/useActionFeedback';
import { currentUser } from '../store/selectors';
import type { Role } from '../store/types';
import { roleLabel, useStore } from '../store/useStore';

const roles: Role[] = ['yonetici_avukat', 'calisan_avukat', 'sekreter', 'stajyer'];

export function UsersScreen() {
  const store = useStore();
  const user = currentUser(store);
  const feedback = useActionFeedback();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('calisan_avukat');
  if (user.role !== 'yonetici_avukat') return <UnauthorizedState />;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const id = feedback.run(
      () => store.createDemoUser(name, role, email),
      'Yeni sentetik persona oluşturuldu.',
    );
    if (id) {
      setName('');
      setEmail('');
      setRole('calisan_avukat');
    }
  };
  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <span className="eyebrow">Yönetici görünümü · Yerel fixture</span>
          <h1>Persona yaşam döngüsü</h1>
          <p>Kullanıcı rolü ve aktifliği yalnız demo davranışını simüle eder.</p>
        </div>
        <StatusBadge
          label={`${store.users.filter((entry) => entry.active).length} aktif`}
          tone="info"
        />
      </header>
      <div className="notice warning" role="note">
        <strong>Sentetik persona simülasyonu.</strong>&nbsp;Gerçek kimlik doğrulama, şifre, hesap,
        token veya oturum yoktur.
      </div>
      {store.settings.offline && (
        <div className="notice warning">
          Çevrimdışıyken persona oluşturma, rol ve aktiflik değişiklikleri kilitlidir.
        </div>
      )}
      <form className="card stack-sm" onSubmit={submit} noValidate>
        <div className="section-heading">
          <div>
            <span className="eyebrow">Dosya yetkisi olmadan başlar</span>
            <h2>Yeni persona</h2>
          </div>
        </div>
        <div className="filter-grid">
          <label className="field">
            <span>Ad</span>
            <input required value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label className="field">
            <span>Sentetik e-posta (isteğe bağlı)</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="persona@example.test"
            />
          </label>
          <label className="field">
            <span>Rol</span>
            <select value={role} onChange={(event) => setRole(event.target.value as Role)}>
              {roles.map((value) => (
                <option value={value} key={value}>
                  {roleLabel[value]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button className="button" type="submit" disabled={store.settings.offline}>
          Sentetik persona oluştur
        </button>
      </form>
      <section className="panel">
        <div className="panel-header">
          <h2>Personalar</h2>
          <span className="count">{store.users.length}</span>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <caption className="sr-only">Sentetik persona yaşam döngüsü</caption>
            <thead>
              <tr>
                <th>Ad</th>
                <th>Rol</th>
                <th>Yetki kapsamı</th>
                <th>Durum</th>
                <th>Eylem</th>
              </tr>
            </thead>
            <tbody>
              {store.users.map((entry) => (
                <tr key={entry.id}>
                  <td>
                    <strong>{entry.name}</strong>
                    <br />
                    <span className="micro muted">{entry.email ?? entry.id}</span>
                  </td>
                  <td>
                    <label className="sr-only" htmlFor={`role-${entry.id}`}>
                      {entry.name} rolü
                    </label>
                    <select
                      id={`role-${entry.id}`}
                      value={entry.role}
                      disabled={store.settings.offline}
                      onChange={(event) =>
                        feedback.run(
                          () => store.setUserRole(entry.id, event.target.value as Role),
                          `${entry.name} rolü güncellendi.`,
                        )
                      }
                    >
                      {roles.map((value) => (
                        <option value={value} key={value}>
                          {roleLabel[value]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    {entry.authorizedFileIds.length
                      ? entry.authorizedFileIds.join(', ')
                      : 'Yalnız triage'}
                  </td>
                  <td>
                    <StatusBadge
                      label={entry.active ? 'Aktif' : 'Pasif'}
                      tone={entry.active ? 'success' : 'neutral'}
                    />
                  </td>
                  <td>
                    <button
                      className="button secondary"
                      type="button"
                      disabled={store.settings.offline || entry.id === user.id}
                      onClick={() =>
                        feedback.run(
                          () => store.setUserActive(entry.id, !entry.active),
                          entry.active
                            ? `${entry.name} pasif yapıldı.`
                            : `${entry.name} aktifleştirildi.`,
                        )
                      }
                    >
                      {entry.active ? 'Pasif yap' : 'Aktif yap'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {feedback.error && (
        <div className="notice danger" role="alert">
          {feedback.error}
        </div>
      )}
      {feedback.message && <SuccessToast message={feedback.message} />}
    </div>
  );
}
