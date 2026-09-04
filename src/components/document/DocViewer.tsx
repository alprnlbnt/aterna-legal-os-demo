import { legalDocuments } from '../../fixtures/documents/legalDocuments';
import type { OcrResult } from '../../store/types';
import type { ReactNode } from 'react';
import { AiStrip } from '../forms/AiStrip';
import { StatusBadge } from '../forms/StatusBadge';

function highlightUncertainPhrases(text: string, uncertainPhrases: string[]): ReactNode[] {
  return uncertainPhrases.reduce<ReactNode[]>(
    (content, phrase, phraseIndex) => {
      const highlighted: ReactNode[] = [];

      content.forEach((part, partIndex) => {
        if (typeof part !== 'string' || !part.includes(phrase)) {
          highlighted.push(part);
          return;
        }

        part.split(phrase).forEach((segment, segmentIndex, segments) => {
          if (segment) highlighted.push(segment);
          if (segmentIndex < segments.length - 1) {
            highlighted.push(
              <mark
                className="uncertain"
                key={`uncertain-${phraseIndex}-${partIndex}-${segmentIndex}`}
              >
                {phrase} ⚠
              </mark>,
            );
          }
        });
      });

      return highlighted;
    },
    [text],
  );
}

export function DocViewer({ documentRef }: { documentRef: string }) {
  const document = legalDocuments[documentRef];
  if (!document) return <div className="notice warning">Yerel belge fixture’ı bulunamadı.</div>;
  return (
    <article className="document-page" aria-label={`${document.title} orijinal belge önizlemesi`}>
      <span className="eyebrow">Orijinal · Değiştirilemez</span>
      <h3>{document.title}</h3>
      <p className="small muted">
        {document.kind} · {document.page}
      </p>
      {document.originalLines.map((line, index) => (
        <div className="document-line" key={`${line}-${index}`}>
          {line}
        </div>
      ))}
    </article>
  );
}

export function OcrPane({ result }: { result?: OcrResult }) {
  if (!result)
    return (
      <div className="ocr-pane">
        <p>OCR sonucu yok.</p>
      </div>
    );
  if (result.failed) {
    return (
      <div className="ocr-pane" role="alert" data-testid="ocr-failed">
        <span className="eyebrow">OCR türevi · Başarısız</span>
        <StatusBadge label="OCR başarısız" tone="danger" />
        <h3 style={{ marginTop: 12 }}>Orijinal belge korundu</h3>
        <p>{result.failed.reason}</p>
        <div className="inline-actions">
          <button className="button secondary" type="button">
            Yeniden fotoğraf iste
          </button>
          <button className="button secondary" type="button">
            Manuel özet ekle
          </button>
        </div>
      </div>
    );
  }
  const content = highlightUncertainPhrases(result.text, result.uncertainPhrases);
  return (
    <article className="ocr-pane" aria-label="OCR metni">
      <span className="eyebrow">OCR türevi · İnsan kontrolü gerekli</span>
      <AiStrip>
        Bu metin yerel fixture’dan gelir; orijinal belge değildir ve üzerine yazmaz.
      </AiStrip>
      <p style={{ marginTop: 16, lineHeight: 1.75 }}>{content}</p>
      <p className="micro muted">Motor: {result.engineVersion}</p>
    </article>
  );
}
