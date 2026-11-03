import { SegmentedControl as UiSegmentedControl, type SegmentedOption } from '@/components/ui/segmented-control';

interface SegmentedControlProps<Value extends string> {
  label: string;
  options: readonly SegmentedOption<Value>[];
  value: Value;
  onChange: (value: Value) => void;
  testIdPrefix: string;
  className?: string;
}

/** The verification stages' pill look of the shared segmented control. */
export function SegmentedControl<Value extends string>({ testIdPrefix, ...props }: SegmentedControlProps<Value>) {
  return <UiSegmentedControl {...props} shape="pill" testId={testIdPrefix} />;
}
