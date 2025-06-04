import React, { useState, useEffect, forwardRef } from 'react';
import { Snackbar, Alert, Typography, Box } from '@mui/material';
import { styled } from '@mui/material/styles';

// Custom styled Alert component
const StyledAlert = styled(Alert)(({ theme }) => ({
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  '& .MuiAlert-message': {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
}));

/**
 * Toast notification component
 * Used for showing temporary notifications
 * 
 * @param {Object} props Component props
 * @param {string} props.severity Alert severity (success, error, warning, info)
 * @param {string} props.title Alert title
 * @param {string} props.message Alert message
 * @param {number} props.duration Duration in milliseconds
 * @param {function} props.onClose Function to call when toast closes
 */
const Toast = forwardRef(({
  open = false,
  severity = 'info',
  title,
  message,
  duration = 5000,
  onClose,
}, ref) => {
  // State to manage Snackbar open state
  const [isOpen, setIsOpen] = useState(open);
  
  // Update local state when props change
  useEffect(() => {
    setIsOpen(open);
  }, [open]);
  
  // Handle close event
  const handleClose = (event, reason) => {
    if (reason === 'clickaway') return;
    
    setIsOpen(false);
    if (onClose) onClose();
  };

  return (
    <Snackbar
      ref={ref}
      open={isOpen}
      autoHideDuration={duration}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      sx={{
        maxWidth: '600px',
        width: '100%',
        top: (theme) => ({ xs: theme.spacing(7), sm: theme.spacing(8) }),
      }}
    >
      <StyledAlert
        severity={severity}
        variant="filled"
        onClose={handleClose}
        elevation={6}
        sx={{ width: '100%' }}
      >
        <Box>
          {title && (
            <Typography variant="subtitle1" component="div" sx={{ fontWeight: 'bold' }}>
              {title}
            </Typography>
          )}
          {message && (
            <Typography variant="body2">{message}</Typography>
          )}
        </Box>
      </StyledAlert>
    </Snackbar>
  );
});

Toast.displayName = 'Toast';

export default Toast;
