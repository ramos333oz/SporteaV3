import React, { useState } from 'react';
import { IconButton, Tooltip, Badge } from '@mui/material';
import ReportIcon from '@mui/icons-material/Report';
import ReportDialog from './ReportDialog';

/**
 * Report Button Component
 * Displays a report button in the navigation that opens the reporting dialog
 */
const ReportButton = () => {
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleOpenDialog = () => {
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  return (
    <>
      <Tooltip title="Report an Issue" arrow>
        <IconButton
          color="inherit"
          onClick={handleOpenDialog}
          aria-label="report issue"
          sx={{
            ml: 1,
            color: 'text.primary',
            '&:hover': {
              backgroundColor: 'rgba(255, 152, 0, 0.1)',
              color: 'warning.main',
              transform: 'scale(1.05)',
            },
            transition: 'all 0.2s ease-in-out'
          }}
        >
          <ReportIcon />
        </IconButton>
      </Tooltip>

      <ReportDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
      />
    </>
  );
};

export default ReportButton;
