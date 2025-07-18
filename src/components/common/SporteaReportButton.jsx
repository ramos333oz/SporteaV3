import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { cva } from 'class-variance-authority';
import ReportDialog from '../reporting/ReportDialog';

// Mural-inspired report button variants
const reportButtonVariants = cva(
  "p-1.5 rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/50",
  {
    variants: {
      variant: {
        default: "hover:bg-gray-100 text-gray-500 hover:text-orange-500",
        warning: "hover:bg-orange-50 text-orange-500 hover:text-orange-600",
        active: "bg-orange-50 text-orange-600",
      },
      size: {
        sm: "p-1",
        default: "p-1.5",
        lg: "p-2",
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export function SporteaReportButton({ 
  className, 
  variant = "default", 
  size = "default",
  ...props 
}) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleOpenDialog = () => {
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  return (
    <>
      <button
        className={cn(reportButtonVariants({ variant, size, className }))}
        onClick={handleOpenDialog}
        aria-label="Report an issue"
        title="Report an issue"
        {...props}
      >
        <AlertTriangle className="w-4 h-4" />
      </button>

      <ReportDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
      />
    </>
  );
}

export default SporteaReportButton;
