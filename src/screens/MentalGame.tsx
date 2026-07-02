import { Card } from '../components/ui/Card';
import { PageWrapper } from '../components/layout/PageWrapper';
import { mentalGameTips } from '../data/mentalGame';

export default function MentalGame() {
  return (
    <PageWrapper title="Mental Game">
      <div className="space-y-3">
        {mentalGameTips.map((tip) => (
          <Card key={tip.id}>
            <p className="text-sm text-chalk-300">{tip.category}</p>
            <p className="text-lg text-ivory-100">{tip.title}</p>
            <p className="text-ivory-200">{tip.content}</p>
          </Card>
        ))}
      </div>
    </PageWrapper>
  );
}
