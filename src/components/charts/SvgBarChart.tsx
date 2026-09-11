import { formatMoney } from '../../lib/format';

export interface ChartDatum {
  key: string;
  label: string;
  total: number;
}

export function SvgBarChart({
  data,
  title = 'Son 6 ay tahsilat',
}: {
  data: ChartDatum[];
  title?: string;
}) {
  const max = Math.max(1, ...data.map((item) => item.total));
  const chartWidth = 660;
  const chartHeight = 230;
  const baseline = 180;
  const slot = chartWidth / Math.max(1, data.length);
  const barWidth = Math.min(58, slot * 0.58);

  return (
    <div className="finance-chart">
      <svg
        role="img"
        aria-labelledby="collections-chart-title collections-chart-description"
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
      >
        <title id="collections-chart-title">{title}</title>
        <desc id="collections-chart-description">
          Onaylı sentetik tahsilatların son altı aya göre çubuk grafiği. Aynı değerler aşağıdaki
          erişilebilir tabloda bulunur.
        </desc>
        <line className="chart-axis" x1="22" y1={baseline} x2={chartWidth - 8} y2={baseline} />
        {data.map((item, index) => {
          const height = (item.total / max) * 132;
          const x = index * slot + (slot - barWidth) / 2;
          return (
            <g key={item.key}>
              <rect
                className="chart-bar"
                x={x}
                y={baseline - height}
                width={barWidth}
                height={height}
                rx="6"
              />
              <text className="chart-value" x={x + barWidth / 2} y={baseline - height - 8}>
                {item.total ? new Intl.NumberFormat('tr-TR').format(item.total) : '0'}
              </text>
              <text className="chart-label" x={x + barWidth / 2} y={baseline + 24}>
                {item.label}
              </text>
            </g>
          );
        })}
      </svg>
      <table className="sr-only">
        <caption>{title} veri tablosu</caption>
        <thead>
          <tr>
            <th scope="col">Ay</th>
            <th scope="col">Tahsilat</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr key={item.key}>
              <th scope="row">{item.label}</th>
              <td>{formatMoney(item.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Sparkline({ data, label }: { data: number[]; label: string }) {
  const width = 120;
  const height = 32;
  const max = Math.max(1, ...data);
  const points = data
    .map((value, index) => {
      const x = data.length <= 1 ? width / 2 : (index / (data.length - 1)) * width;
      const y = height - (value / max) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(' ');
  return (
    <svg className="sparkline" role="img" aria-label={label} viewBox={`0 0 ${width} ${height}`}>
      <polyline points={points} />
    </svg>
  );
}
