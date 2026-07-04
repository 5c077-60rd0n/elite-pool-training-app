import type { AdaptiveDailyPlan, DailySessionLog, RecoveryRecommendationPlan } from '../types/tracker';
import type { TrackerGamificationSnapshot } from './trackerGamification';

export interface NotificationInsight {
  id: string;
  title: string;
  message: string;
  severity: 'high' | 'medium' | 'low';
}

function daysSince(dateIso: string, now = new Date()): number {
  const parsed = Date.parse(`${dateIso}T00:00:00`);
  if (Number.isNaN(parsed)) return 999;
  const diffMs = now.getTime() - parsed;
  return Math.floor(diffMs / (24 * 60 * 60 * 1000));
}

export function getNotificationInsights(
  logs: DailySessionLog[],
  gamification: TrackerGamificationSnapshot,
  adaptivePlan: AdaptiveDailyPlan | null,
  recoveryPlan: RecoveryRecommendationPlan | null,
  now = new Date(),
): NotificationInsight[] {
  const insights: NotificationInsight[] = [];

  const latestLog = [...logs].sort((a, b) => Date.parse(b.date) - Date.parse(a.date))[0];
  const daysIdle = latestLog ? daysSince(latestLog.date, now) : 999;

  if (daysIdle >= 1) {
    insights.push({
      id: 'streak-risk',
      title: 'Streak At Risk',
      message:
        gamification.streakDays > 0
          ? `Your ${gamification.streakDays}-day streak is at risk. Log today to keep momentum.`
          : 'No session logged today yet. Bank one focused session to restart momentum.',
      severity: 'high',
    });
  }

  const nearQuest = gamification.weeklyQuests.find(
    (quest) => !quest.completed && quest.target - quest.progress <= 1,
  );
  if (nearQuest) {
    insights.push({
      id: `quest-near-${nearQuest.id}`,
      title: 'Quest Nearly Complete',
      message: `${nearQuest.name} is one step away (${nearQuest.progress}/${nearQuest.target}).`,
      severity: 'medium',
    });
  }

  if (adaptivePlan && logs.length >= 2) {
    const recent = [...logs].sort((a, b) => Date.parse(b.date) - Date.parse(a.date)).slice(0, 3);
    const avgDrillRoom =
      recent.reduce((sum, item) => sum + item.drillRoomShotmakingPct, 0) / Math.max(1, recent.length);
    const avgGhost =
      recent.reduce((sum, item) => sum + item.ghostDrillWinRatePct, 0) / Math.max(1, recent.length);

    const kpiMiss =
      avgDrillRoom < adaptivePlan.targetMetrics.drillRoomShotmakingPct - 8 ||
      avgGhost < adaptivePlan.targetMetrics.ghostDrillWinRatePct - 8;

    if (kpiMiss) {
      insights.push({
        id: 'kpi-miss',
        title: 'KPI Drift Detected',
        message: `Recent sessions are below adaptive targets. Focus ${adaptivePlan.focusKpiName} first today.`,
        severity: 'high',
      });
    }
  }

  if (recoveryPlan) {
    insights.push({
      id: 'recovery-active',
      title: 'Recovery Protocol Active',
      message: `${recoveryPlan.horizonDays}-day protocol is active. Next focus: ${recoveryPlan.focusKpiName}.`,
      severity: recoveryPlan.severity === 'high' ? 'high' : 'medium',
    });
  }

  const severityOrder: Record<NotificationInsight['severity'], number> = {
    high: 0,
    medium: 1,
    low: 2,
  };

  return insights.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}
