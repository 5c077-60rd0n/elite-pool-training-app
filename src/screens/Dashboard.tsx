import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { PageWrapper } from '../components/layout/PageWrapper';
import { getTipOfDay } from '../data/mentalGame';
import { useProgramStore, getProgramWeek } from '../store/useProgramStore';

export default function Dashboard() {
  const currentWeek = useProgramStore((s) => s.currentWeek);
  const week = getProgramWeek(currentWeek);
  const tip = getTipOfDay();

  return (
    <PageWrapper title="Dashboard">
      <Card className="mb-4 bg-gradient-to-br from-felt-700 to-felt-800">
        <p className="text-sm text-chalk-300">Week {week.week} of 52</p>
        <p className="text-xl font-semibold text-ivory-100">Phase {week.phase} · {week.theme}</p>
      </Card>

      <Card title="Today's Session" className="mb-4">
        <p className="mb-3 text-ivory-100">{week.dailySessions.monday.focusArea} · 60 minutes</p>
        <Link to="/session/today">
          <Button>Start Session</Button>
        </Link>
      </Card>

      <Card title="Mental Game Tip">
        <p className="text-sm text-chalk-300">{tip.title}</p>
        <p className="text-ivory-100">{tip.content}</p>
      </Card>
    </PageWrapper>
  );
}
