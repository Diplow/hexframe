import type { BaseWidgetProps, CanvasOperationProps } from '../_base/widget.types';

export interface PreviewWidgetProps extends BaseWidgetProps, CanvasOperationProps {
  mode: 'view' | 'edit';
  content: string;
  onEdit?: () => void;
  onSave?: (content: string) => void;
  onCancel?: () => void;
}