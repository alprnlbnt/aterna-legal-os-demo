import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { StatusBadge, statusPresentation } from '../components/forms/StatusBadge';
import { UnauthorizedState } from '../components/states/States';
import { canAccessFile } from '../store/invariants';
import { currentUser, selectVisibleContacts } from '../store/selectors';
import { useStore } from '../store/useStore';
import { useTableFilter } from '../lib/table';

type ContactFilter = 'all' | 'muvekkil' | 'aday' | 'karsi_taraf';

export function ContactsScreen() {
  const store = useStore();
  const contacts = selectVisibleContacts(store);
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<ContactFilter>('all');
  const filtered = useTableFilter(
    contacts,
    { query, kind },
    (contact, filters) =>
      (filters.kind === 'all' || contact.kind === filters.kind) &&
      `${contact.name} ${contact.communication}`
        .toLocaleLowerCase('tr-TR')
        .includes(filters.query.trim().toLocaleLowerCase('tr-TR')),
  );
  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <span className="eyebrow">Müvekkil · Aday · Karşı taraf</span>
          <h1>Kişiler</h1>
          <p>
            İletişim ve dosya ilişkileri; basit isim eşleşmesi yalnız çıkar çatışması uyarısı
            üretir.
          </p>
        </div>
        <Link className="button" to="/kisiler/yeni">
          + Kişi oluştur
        </Link>
      </header>
      <section className="card stack-sm" aria-label="Kişi arama ve filtreleri">
        <label className="field">
          <span>Kişilerde ara</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ad veya iletişim"
          />
        </label>
        <div className="chip-row" aria-label="Kişi türü">
          {(
            [
              ['all', 'Tümü'],
              ['muvekkil', 'Müvekkil'],
              ['aday', 'Aday'],
              ['karsi_taraf', 'Karşı taraf'],
            ] as [ContactFilter, string][]
          ).map(([value, label]) => (
            <button
              className="chip"
              type="button"
              aria-pressed={kind === value}
              key={value}
              onClick={() => setKind(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </section>
      <section className="panel">
        <div className="panel-body">
          {filtered.map((contact) => (
            <Link className="list-row" to={`/kisiler/${contact.id}`} key={contact.id}>
              <span className="contact-avatar">
                {contact.name
                  .split(' ')
                  .slice(0, 2)
                  .map((part) => part[0])
                  .join('')}
              </span>
              <span className="list-row__main">
                <div className="inline-actions">
                  <h3>{contact.name}</h3>
                  <StatusBadge
                    label={contact.kind.replace('_', ' ')}
                    tone={contact.kind === 'aday' ? 'candidate' : 'info'}
                  />
                  {contact.conflictFlag && (
                    <StatusBadge label="İsim eşleşmesi uyarısı" tone="pending" />
                  )}
                </div>
                <p>{contact.communication}</p>
              </span>
              <span aria-hidden="true">›</span>
            </Link>
          ))}
          {filtered.length === 0 && (
            <p className="muted">Bu arama ve tür filtresiyle eşleşen kişi yok.</p>
          )}
        </div>
      </section>
    </div>
  );
}

export function ContactDetailScreen() {
  const store = useStore();
  const { kisiId = '' } = useParams();
  const user = currentUser(store);
  const rawContact = store.contacts.find((item) => item.id === kisiId);
  const visibleContacts = selectVisibleContacts(store, user);
  const contact = visibleContacts.find((item) => item.id === kisiId);
  if (!rawContact)
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
  if (!contact) {
    return <UnauthorizedState onRequest={() => store.requestAccess('kisitli-kisi')} />;
  }
  const relatedFiles = store.files.filter(
    (file) =>
      (file.clientId === contact.id || file.opposingPartyId === contact.id) &&
      canAccessFile(user, file.id),
  );
  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <span className="eyebrow">Kişi · {contact.kind.replace('_', ' ')}</span>
          <h1>{contact.name}</h1>
          <p>{contact.communication}</p>
        </div>
        <div className="page-actions">
          <StatusBadge
            label={contact.kind.replace('_', ' ')}
            tone={contact.kind === 'aday' ? 'candidate' : 'info'}
          />
          <Link className="button secondary" to={`/kisiler/${contact.id}/duzenle`}>
            Kişiyi düzenle
          </Link>
        </div>
      </header>
      {contact.conflictFlag && (
        <div className="notice warning">
          <strong>Basit isim eşleşmesi:</strong>&nbsp;Benzer bir karşı taraf kaydı olabilir. Sistem
          hukuki çıkar çatışması kararı vermez ve kişileri otomatik birleştirmez.
        </div>
      )}
      <div className="grid-2">
        <section className="card">
          <span className="eyebrow">İlişki ağı</span>
          <h2>Yönlendirme</h2>
          <p>
            {contact.referredBy
              ? `Yönlendiren: ${visibleContacts.find((item) => item.id === contact.referredBy)?.name ?? 'Kısıtlı kişi'}`
              : 'Kayıtlı yönlendiren yok.'}
          </p>
        </section>
        <section className="card">
          <span className="eyebrow">İletişim ilkesi</span>
          <h2>Büro kontrollü</h2>
          <p>
            Müvekkile evrak yükleme linki verilmez. Toplu dış iletişim bu demo kapsamı dışındadır.
          </p>
        </section>
      </div>
      <section className="panel">
        <div className="panel-header">
          <h2>İlgili dosyalar</h2>
          <span className="count">{relatedFiles.length}</span>
        </div>
        <div className="panel-body">
          {relatedFiles.map((file) => (
            <Link className="list-row" to={`/dosyalar/${file.id}`} key={file.id}>
              <span className="list-row__main">
                <h3>{file.name}</h3>
                <p>{file.subject}</p>
              </span>
              <StatusBadge {...statusPresentation(file.status)} />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
