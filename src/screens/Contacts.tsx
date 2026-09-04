import { Link, useParams } from 'react-router-dom';
import { StatusBadge, statusPresentation } from '../components/forms/StatusBadge';
import { UnauthorizedState } from '../components/states/States';
import { canAccessFile } from '../store/invariants';
import { currentUser, selectVisibleContacts } from '../store/selectors';
import { useStore } from '../store/useStore';

export function ContactsScreen() {
  const store = useStore();
  const contacts = selectVisibleContacts(store);
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
        <button className="button" type="button">
          + Kişi taslağı
        </button>
      </header>
      <section className="panel">
        <div className="panel-body">
          {contacts.map((contact) => (
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
        <StatusBadge
          label={contact.kind.replace('_', ' ')}
          tone={contact.kind === 'aday' ? 'candidate' : 'info'}
        />
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
