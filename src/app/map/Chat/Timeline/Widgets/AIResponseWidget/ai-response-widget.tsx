import { useJobPolling } from '~/app/map/Chat/Timeline/Widgets/AIResponseWidget/_hooks/useJobPolling';
import { useProgressAnimation } from '~/app/map/Chat/Timeline/Widgets/AIResponseWidget/_hooks/useProgressAnimation';
import { DirectResponse } from '~/app/map/Chat/Timeline/Widgets/AIResponseWidget/_components/DirectResponse';
import { PendingStatus } from '~/app/map/Chat/Timeline/Widgets/AIResponseWidget/_components/PendingStatus';
import { ProcessingStatus } from '~/app/map/Chat/Timeline/Widgets/AIResponseWidget/_components/ProcessingStatus';
import { CompletedStatus } from '~/app/map/Chat/Timeline/Widgets/AIResponseWidget/_components/CompletedStatus';
import { FailedStatus } from '~/app/map/Chat/Timeline/Widgets/AIResponseWidget/_components/FailedStatus';
import { LoadingState } from '~/app/map/Chat/Timeline/Widgets/AIResponseWidget/_components/LoadingState';

interface AIResponseWidgetProps {
  jobId?: string;
  initialResponse?: string;
  model?: string;
  timestamp?: number | Date;
}

export function AIResponseWidget({ jobId, initialResponse, model, timestamp }: AIResponseWidgetProps) {
  const { status, response, error, elapsedTime } = useJobPolling(jobId, initialResponse);
  useProgressAnimation();

  if (status === 'direct') {
    return <DirectResponse response={response} model={model} timestamp={timestamp} />;
  }

  if (status === 'pending') {
    return <PendingStatus jobId={jobId} elapsedTime={elapsedTime} />;
  }

  if (status === 'processing') {
    return <ProcessingStatus model={model} elapsedTime={elapsedTime} />;
  }

  if (status === 'completed') {
    return <CompletedStatus response={response} model={model} elapsedTime={elapsedTime} />;
  }

  if (status === 'failed') {
    return <FailedStatus error={error} jobId={jobId} />;
  }

  return <LoadingState />;
}
