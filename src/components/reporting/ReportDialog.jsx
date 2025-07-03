import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Chip,
  Divider
} from '@mui/material';
import ReportIcon from '@mui/icons-material/Report';
import { useAuth } from '../../hooks/useAuth';
import { reportService } from '../../services/reportService';
import { useToast } from '../../contexts/ToastContext';

/**
 * Report Dialog Component
 * Comprehensive reporting form with rate limiting and validation
 */
const ReportDialog = ({ open, onClose }) => {
  const { user } = useAuth();
  const { showSuccessToast, showErrorToast } = useToast();
  
  const [formData, setFormData] = useState({
    category: '',
    title: '',
    description: '',
    playerName: ''
  });
  const [loading, setLoading] = useState(false);
  const [rateLimitInfo, setRateLimitInfo] = useState(null);
  const [errors, setErrors] = useState({});
  const [checkingLimit, setCheckingLimit] = useState(false);

  // Get report categories
  const categories = reportService.getReportCategories();

  // Check rate limit when dialog opens
  useEffect(() => {
    if (open && user) {
      checkRateLimit();
    }
  }, [open, user]);

  const checkRateLimit = async () => {
    setCheckingLimit(true);
    try {
      const result = await reportService.canUserReport(user.id);
      setRateLimitInfo(result);
    } catch (error) {
      console.error('Error checking rate limit:', error);
      showErrorToast('Failed to check report limit');
    } finally {
      setCheckingLimit(false);
    }
  };

  const handleInputChange = (field) => (event) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.category) {
      newErrors.category = 'Please select a category';
    }
    if (!formData.title.trim()) {
      newErrors.title = 'Please enter a title';
    } else if (formData.title.trim().length < 5) {
      newErrors.title = 'Title must be at least 5 characters';
    }
    if (!formData.description.trim()) {
      newErrors.description = 'Please enter a description';
    } else if (formData.description.trim().length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    }
    if (formData.category === 'player' && !formData.playerName.trim()) {
      newErrors.playerName = 'Please enter the player name';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const result = await reportService.submitReport(user.id, formData);
      
      if (result.success) {
        showSuccessToast('Report submitted successfully. We\'ll review it shortly.');
        setFormData({
          category: '',
          title: '',
          description: '',
          playerName: ''
        });
        onClose();
        
        // Update rate limit info
        await checkRateLimit();
      } else {
        showErrorToast(result.error || 'Failed to submit report');
      }
    } catch (error) {
      showErrorToast('Failed to submit report');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({
        category: '',
        title: '',
        description: '',
        playerName: ''
      });
      setErrors({});
      onClose();
    }
  };

  const selectedCategory = categories.find(cat => cat.value === formData.category);

  // Show rate limit reached dialog
  if (rateLimitInfo && !rateLimitInfo.canReport) {
    return (
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ pb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ReportIcon color="warning" />
            Report Limit Reached
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            You have reached your daily report limit (3 reports per day). 
            This helps us prevent spam and ensures quality reports.
          </Alert>
          <Typography variant="body2" color="text.secondary">
            You can submit more reports tomorrow. Thank you for helping us improve Sportea!
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} variant="contained">
            Understood
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Report an Issue</Typography>
          {rateLimitInfo && !checkingLimit && (
            <Chip
              label={`${rateLimitInfo.remainingReports} reports remaining today`}
              size="small"
              color={rateLimitInfo.remainingReports <= 1 ? 'warning' : 'primary'}
              variant="outlined"
            />
          )}
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
          {/* Category Selection */}
          <FormControl fullWidth error={!!errors.category}>
            <InputLabel>Category *</InputLabel>
            <Select
              value={formData.category}
              onChange={handleInputChange('category')}
              label="Category *"
            >
              {categories.map((category) => (
                <MenuItem key={category.value} value={category.value}>
                  <Box>
                    <Typography variant="body1">{category.label}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {category.description}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
            {errors.category && (
              <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                {errors.category}
              </Typography>
            )}
          </FormControl>

          {/* Category Examples */}
          {selectedCategory && (
            <Alert severity="info" sx={{ py: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                Examples for {selectedCategory.label}:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selectedCategory.examples.map((example, index) => (
                  <Chip
                    key={index}
                    label={example}
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: '0.75rem' }}
                  />
                ))}
              </Box>
            </Alert>
          )}

          {/* Title */}
          <TextField
            fullWidth
            label="Title *"
            value={formData.title}
            onChange={handleInputChange('title')}
            error={!!errors.title}
            helperText={errors.title || "Brief, descriptive title for your report"}
            placeholder="e.g., App crashes when joining a match"
            inputProps={{ maxLength: 100 }}
          />

          {/* Player Name (only for player issues) */}
          {formData.category === 'player' && (
            <TextField
              fullWidth
              label="Player Name *"
              value={formData.playerName}
              onChange={handleInputChange('playerName')}
              error={!!errors.playerName}
              helperText={errors.playerName || "Enter the name of the player you're reporting"}
              placeholder="Player's full name or username"
              inputProps={{ maxLength: 50 }}
            />
          )}

          {/* Description */}
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Description *"
            value={formData.description}
            onChange={handleInputChange('description')}
            error={!!errors.description}
            helperText={errors.description || "Please provide detailed information about the issue"}
            placeholder={
              formData.category === 'technical' 
                ? "Describe what happened, when it occurred, and any error messages you saw..."
                : formData.category === 'player'
                ? "Describe the player's behavior and when it occurred..."
                : "Describe your concern or feedback in detail..."
            }
            inputProps={{ maxLength: 1000 }}
          />

          {/* Character count */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              {formData.description.length}/1000 characters
            </Typography>
            {formData.category && (
              <Typography variant="caption" color="primary">
                Priority: {reportService.calculatePriority(formData.category).toUpperCase()}
              </Typography>
            )}
          </Box>

          <Divider />

          {/* Help Text */}
          <Alert severity="info" sx={{ py: 1 }}>
            <Typography variant="body2">
              <strong>Tips for effective reports:</strong>
            </Typography>
            <Typography variant="body2" component="ul" sx={{ mt: 1, pl: 2 }}>
              <li>Be specific and provide clear details</li>
              <li>Include steps to reproduce technical issues</li>
              <li>Mention your device/browser for technical problems</li>
              <li>Be respectful when reporting player behavior</li>
            </Typography>
          </Alert>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !formData.category || !formData.title || !formData.description}
          startIcon={loading && <CircularProgress size={20} />}
        >
          {loading ? 'Submitting...' : 'Submit Report'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReportDialog;
