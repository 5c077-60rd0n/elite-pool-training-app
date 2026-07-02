import { Card } from '../components/ui/Card';
import { PageWrapper } from '../components/layout/PageWrapper';

interface ScreenScaffoldProps {
  title: string;
  subtitle: string;
}

export function ScreenScaffold({ title, subtitle }: ScreenScaffoldProps) {
  return (
    <PageWrapper title={title}>
      <Card>
        <p className="text-ivory-100">{subtitle}</p>
      </Card>
    </PageWrapper>
  );
}
