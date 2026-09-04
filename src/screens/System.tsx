import { Link } from 'react-router-dom';

export function NotFoundScreen() {
  return (
    <div className="state-block">
      <div className="state-block__content">
        <span className="eyebrow">404 · Yerel rota</span>
        <h1>Bu ekran bulunamadı</h1>
        <p>Sentetik demo içinde böyle bir route veya kayıt yok.</p>
        <Link className="button" to="/bugun">
          Bugün’e dön
        </Link>
      </div>
    </div>
  );
}
