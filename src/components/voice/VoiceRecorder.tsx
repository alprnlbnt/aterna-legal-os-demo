import { useEffect, useState } from 'react';
import { Icon } from '../forms/Icon';

type RecorderState = 'idle' | 'recording' | 'paused' | 'complete';

export function VoiceRecorder({
  onComplete,
  onCancel,
}: {
  onComplete: () => void;
  onCancel: () => void;
}) {
  const [state, setState] = useState<RecorderState>('idle');
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (state !== 'recording') return;
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [state]);
  const display = `00:${String(seconds).padStart(2, '0')}`;
  const complete = () => {
    setState('complete');
    onComplete();
  };
  return (
    <section className="recorder" aria-label="Sentetik sesli not kaydı">
      <div className="recorder-display">
        <div>
          <span className="eyebrow" style={{ color: '#a7c5c7' }}>
            Orijinal ses · Cihaza kayıt yapılmaz
          </span>
          <strong>
            {state === 'idle' ? 'Kayıt hazır' : state === 'complete' ? 'Kayıt tamamlandı' : display}
          </strong>
        </div>
        <div className="waveform" aria-hidden="true">
          {Array.from({ length: 18 }, (_, index) => (
            <span key={index} />
          ))}
        </div>
      </div>
      <div className="inline-actions primary-mobile">
        {state === 'idle' && (
          <button className="button" type="button" onClick={() => setState('recording')}>
            <Icon name="mic" size={17} /> Kaydı başlat
          </button>
        )}
        {state === 'recording' && (
          <button className="button" type="button" onClick={() => setState('paused')}>
            Duraklat
          </button>
        )}
        {state === 'paused' && (
          <button className="button" type="button" onClick={() => setState('recording')}>
            Sürdür
          </button>
        )}
        {(state === 'recording' || state === 'paused') && (
          <button className="button secondary" type="button" onClick={complete}>
            Tamamla
          </button>
        )}
        {state !== 'complete' && (
          <button
            className="button secondary"
            type="button"
            onClick={() => {
              setState('idle');
              setSeconds(0);
              onCancel();
            }}
          >
            İptal
          </button>
        )}
      </div>
    </section>
  );
}
