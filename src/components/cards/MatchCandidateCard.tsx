import type { CaseFile, MatchCandidate } from '../../store/types';
import { SourceLabel } from '../forms/SourceLabel';
import { StatusBadge } from '../forms/StatusBadge';

export function MatchCandidateCard({
  candidate,
  file,
  selected,
  onSelect,
}: {
  candidate: MatchCandidate;
  file: CaseFile;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <label className="match-card">
      <input
        type="radio"
        name="match-candidate"
        checked={selected}
        onChange={onSelect}
        aria-label={`${file.name} dosyasını eşleşme adayı olarak seç`}
      />
      <span>
        <span className="inline-actions">
          <StatusBadge
            label={`${candidate.confidence === 'yuksek' ? 'Yüksek' : 'Düşük'} güven`}
            tone={candidate.confidence === 'yuksek' ? 'success' : 'pending'}
          />
          <span className="status-badge candidate">AI eşleşme adayı</span>
        </span>
        <h3>{file.name}</h3>
        <p>
          {file.caseNumber ?? 'Esas numarası yok'} · {candidate.rationale}
        </p>
        <SourceLabel>{candidate.sourcePassage}</SourceLabel>
      </span>
    </label>
  );
}
