import { Link } from 'react-router-dom';
import type { StatusTone } from '../../store/types';
import { SourceLabel } from '../forms/SourceLabel';
import { StatusBadge } from '../forms/StatusBadge';

export interface WorkCardProps {
  category: string;
  title: string;
  context: string;
  time: string;
  status: string;
  statusTone?: StatusTone;
  owner: string;
  actionLabel: string;
  actionTo: string;
  source?: string;
  tone?: StatusTone;
}

export function WorkCard({
  category,
  title,
  context,
  time,
  status,
  statusTone = 'neutral',
  owner,
  actionLabel,
  actionTo,
  source,
  tone = 'neutral',
}: WorkCardProps) {
  return (
    <article className={`work-card ${tone}`}>
      <div>
        <span className="eyebrow">{category}</span>
        <h3>{title}</h3>
        <p>{context}</p>
        <div className="work-card__meta">
          <span>{time}</span>
          <span>Sahip: {owner}</span>
          <StatusBadge label={status} tone={statusTone} />
        </div>
        {source && (
          <div style={{ marginTop: 10 }}>
            <SourceLabel>{source}</SourceLabel>
          </div>
        )}
      </div>
      <div className="work-card__action">
        <Link className="button secondary" to={actionTo}>
          {actionLabel}
        </Link>
      </div>
    </article>
  );
}
