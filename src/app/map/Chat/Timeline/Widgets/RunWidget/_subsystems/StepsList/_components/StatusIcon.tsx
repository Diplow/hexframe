'use client';

import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import type { ExecutedStep } from '~/app/map/Chat/Timeline/Widgets/RunWidget/_subsystems/StepsList/types';

interface StatusIconProps {
  status: ExecutedStep['status'];
}

export function StatusIcon({ status }: StatusIconProps) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="h-3.5 w-3.5 text-success" />;
    case 'blocked':
      return <AlertTriangle className="h-3.5 w-3.5 text-secondary" />;
    case 'error':
      return <XCircle className="h-3.5 w-3.5 text-destructive" />;
  }
}
