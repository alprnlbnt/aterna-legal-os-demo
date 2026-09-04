import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { DecisionSurface } from '../../components/approval/DecisionSurface';
import { MatchCandidateCard } from '../../components/cards/MatchCandidateCard';
import { WorkCard } from '../../components/cards/WorkCard';
import { VersionDiff } from '../../components/diff/VersionDiff';
import { OcrPane } from '../../components/document/DocViewer';
import { OfflineBanner, UnauthorizedState } from '../../components/states/States';
import { makeSeed } from '../../fixtures/seed';

describe('ortak karar ve durum bileşenleri', () => {
  it('WorkCard tek birincil eylem ve bağlamı gösterir', () => {
    render(
      <MemoryRouter>
        <WorkCard
          category="Süre"
          title="Beyan hazırla"
          context="Kurgu dosya"
          time="Bugün"
          status="Onay bekliyor"
          owner="Av. Alper"
          actionLabel="Kararı aç"
          actionTo="/gorevler/a"
        />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: 'Beyan hazırla' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Kararı aç' })).toHaveAttribute('href', '/gorevler/a');
  });

  it('DecisionSurface gerekçe ve ikinci doğrulama olmadan onayı açmaz', async () => {
    const user = userEvent.setup();
    const approve = vi.fn();
    render(<DecisionSurface actionLabel="Teyit et" onApprove={approve} />);
    const button = screen.getByRole('button', { name: 'Teyit et' });
    expect(button).toBeDisabled();
    await user.type(screen.getByLabelText('Karar gerekçesi'), 'Kaynak belge kontrol edildi.');
    expect(button).toBeDisabled();
    await user.click(screen.getByRole('checkbox'));
    expect(button).toBeEnabled();
    await user.click(button);
    expect(approve).toHaveBeenCalledWith('Kaynak belge kontrol edildi.', true);
  });

  it('MatchCandidate seçili başlamaz', () => {
    const data = makeSeed();
    const candidate = data.incomingDocuments[0].matchCandidates[0];
    const file = data.files.find((item) => item.id === candidate.fileId)!;
    render(
      <MatchCandidateCard candidate={candidate} file={file} selected={false} onSelect={vi.fn()} />,
    );
    expect(screen.getByRole('radio')).not.toBeChecked();
    expect(screen.queryByText(/Varsayılan/i)).not.toBeInTheDocument();
  });

  it('VersionDiff kritik değişikliği görünür etiketler', () => {
    const differences = makeSeed().generatedDocuments.find((item) => item.id === 'belge-teklif-2')!
      .versions[1].differences!;
    render(<VersionDiff differences={differences} />);
    expect(screen.getByTestId('version-diff')).toBeInTheDocument();
    expect(screen.getAllByText('Kritik · yeniden onay')).toHaveLength(3);
  });

  it('OcrPane başarısızlıkta orijinalin korunduğunu açıklar', () => {
    const result = makeSeed().ocrResults.find((item) => item.id === 'ocr-003');
    render(<OcrPane result={result} />);
    expect(screen.getByTestId('ocr-failed')).toHaveTextContent('Orijinal belge korundu');
    expect(screen.getByRole('button', { name: 'Manuel özet ekle' })).toBeInTheDocument();
  });

  it('yetkisiz ve çevrimdışı durumlarını semantik olarak bildirir', () => {
    render(
      <>
        <UnauthorizedState />
        <OfflineBanner lastSync="3 Eylül 08:12" />
      </>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('görme yetkin yok');
    expect(screen.getByRole('status')).toHaveTextContent('Final onay');
  });
});
