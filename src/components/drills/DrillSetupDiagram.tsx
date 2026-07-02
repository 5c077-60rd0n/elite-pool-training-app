import type { DrillDiagram, DrillDiagramPath } from '../../types/models';

interface DrillSetupDiagramProps {
  diagram: DrillDiagram;
}

function colorForPath(role: DrillDiagramPath['role']): string {
  if (role === 'aim') return '#00bfff';
  if (role === 'object-path') return '#c9a84c';
  if (role === 'cue-path') return '#f3f5f8';
  return '#5ec8ff';
}

function colorForBall(role: DrillDiagram['balls'][number]['role']): string {
  if (role === 'cue') return '#f3f5f8';
  if (role === 'object') return '#c9a84c';
  if (role === 'target') return '#67e8f9';
  return '#94a3b8';
}

function colorForZone(role: NonNullable<DrillDiagram['zones']>[number]['role']): string {
  if (role === 'target') return 'rgba(0, 191, 255, 0.16)';
  if (role === 'window') return 'rgba(201, 168, 76, 0.18)';
  return 'rgba(220, 38, 38, 0.16)';
}

export function DrillSetupDiagram({ diagram }: DrillSetupDiagramProps) {
  const pocketRadius = diagram.pocketMouthInches / 2;
  const pockets = [
    { x: 0, y: 0 },
    { x: 50, y: 0 },
    { x: 100, y: 0 },
    { x: 0, y: 50 },
    { x: 50, y: 50 },
    { x: 100, y: 50 },
  ];

  return (
    <div className="space-y-3">
      <svg
        viewBox="-4 -4 108 58"
        className="w-full rounded-xl border border-felt-600 bg-felt-900 p-2"
        role="img"
        aria-label="Pool drill setup diagram"
      >
        <defs>
          <marker id="arrowhead" markerWidth="4" markerHeight="4" refX="3" refY="2" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L4,2 L0,4 z" fill="#e8e8e8" />
          </marker>
        </defs>

        <rect x="0" y="0" width="100" height="50" rx="2" fill="#0d1b2a" stroke="#0097cc" strokeWidth="0.9" />

        {[12.5, 25, 37.5, 62.5, 75, 87.5].map((x) => (
          <circle key={`d-top-${x}`} cx={x} cy={1.4} r={0.28} fill="#89a7bf" />
        ))}
        {[12.5, 25, 37.5, 62.5, 75, 87.5].map((x) => (
          <circle key={`d-bottom-${x}`} cx={x} cy={48.6} r={0.28} fill="#89a7bf" />
        ))}

        {diagram.zones?.map((zone) => (
          <g key={zone.id}>
            <rect
              x={zone.x - zone.width / 2}
              y={zone.y - zone.height / 2}
              width={zone.width}
              height={zone.height}
              rx="1"
              fill={colorForZone(zone.role)}
              stroke="#b4d8f5"
              strokeDasharray="1.4 1.2"
              strokeWidth="0.25"
            />
            {zone.label ? (
              <text x={zone.x} y={zone.y} textAnchor="middle" fontSize="1.8" fill="#d9edf9">
                {zone.label}
              </text>
            ) : null}
          </g>
        ))}

        {diagram.paths.map((path) => {
          const points = [path.from, ...(path.via ?? []), path.to]
            .map((point) => `${point.x},${point.y}`)
            .join(' ');
          const stroke = colorForPath(path.role);
          return (
            <g key={path.id}>
              <polyline
                points={points}
                fill="none"
                stroke={stroke}
                strokeWidth="0.55"
                strokeDasharray={path.dashed ? '1.2 1.1' : undefined}
                markerEnd="url(#arrowhead)"
              />
              {path.label ? (
                <text x={path.to.x + 1.1} y={path.to.y + 1.1} fontSize="1.8" fill="#e8eef3">
                  {path.label}
                </text>
              ) : null}
            </g>
          );
        })}

        {diagram.balls.map((ball) => (
          <g key={ball.id}>
            <circle cx={ball.x} cy={ball.y} r="1.125" fill={colorForBall(ball.role)} stroke="#0f172a" strokeWidth="0.25" />
            <text x={ball.x} y={ball.y + 0.5} textAnchor="middle" fontSize="1.8" fill="#0f172a" fontWeight="bold">
              {ball.label}
            </text>
          </g>
        ))}

        {pockets.map((pocket, index) => (
          <circle key={`pocket-${index}`} cx={pocket.x} cy={pocket.y} r={pocketRadius} fill="#05080f" stroke="#172538" strokeWidth="0.2" />
        ))}
      </svg>

      <p className="text-xs text-chalk-300">
        Diagram scale: 9ft table modeled as 100 x 50 inch playing surface, 4.5 inch pocket mouths.
      </p>

      {diagram.notes?.length ? (
        <ul className="list-disc space-y-1 pl-5 text-xs text-ivory-200">
          {diagram.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
