import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { tourSteps } from './steps';

export function TourCard() {
  const { settings, setTour } = useStore();
  const navigate = useNavigate();
  if (!settings.tourActive) return null;
  const step = tourSteps[settings.tourStep] ?? tourSteps[0];
  const isLast = settings.tourStep === tourSteps.length - 1;
  const next = () => {
    if (isLast) {
      setTour(false);
      return;
    }
    const index = settings.tourStep + 1;
    setTour(true, index);
    navigate(tourSteps[index].route);
  };
  return (
    <aside className="tour-card" aria-live="polite" aria-label="Rehberli golden path turu">
      <span className="eyebrow">
        Rehberli tur · {settings.tourStep + 1}/{tourSteps.length}
      </span>
      <h2>{step.title}</h2>
      <p>{step.text}</p>
      <div className="inline-actions">
        <button className="button" type="button" onClick={next}>
          {isLast ? 'Turu tamamla' : 'Sonraki adım'}
        </button>
        <button className="button quiet" type="button" onClick={() => setTour(false)}>
          Kapat
        </button>
      </div>
    </aside>
  );
}
