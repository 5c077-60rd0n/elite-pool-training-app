const diagramEligibleDrillIds = new Set<string>([
  'straight-line-drill',
  'pause-at-back-verification',
  'slow-motion-stroke-drill',
  'cut-shot-matrix',
  'fractional-ball-drill',
  'thin-cut-practice',
  'l-drill',
  'five-position-drill',
  'rail-control-drill',
  'stop-shot-matrix',
  'speed-control-5-zone-drill',
  'thin-cut-safe-drill',
  'cluster-safe-drill',
  'roll-up-safety-drill',
  'kick-safe-drill',
  '9-ball-break-zone-chart',
  'half-power-mechanics-break',
  'cross-side-bank-matrix',
  'one-rail-kick-drill',
  'two-rail-kick-system',
  'rail-first-shot-drill',
  'break-ball-drill',
  'safety-cluster-drill',
]);

export function shouldRenderDrillDiagram(drillId: string): boolean {
  return diagramEligibleDrillIds.has(drillId);
}
