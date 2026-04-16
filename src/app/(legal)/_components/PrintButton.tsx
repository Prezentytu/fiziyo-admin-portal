'use client';

import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PrintButtonProps {
  testId: string;
}

export function PrintButton({ testId }: PrintButtonProps) {
  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handlePrint}
      data-testid={testId}
      className="gap-2 print:hidden"
    >
      <Printer className="h-4 w-4" />
      Drukuj / zapisz PDF
    </Button>
  );
}
