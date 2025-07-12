# User Reporting System Implementation Guide - SporteaV3

## Executive Summary

This document outlines the implementation of a comprehensive user reporting system for SporteaV3. The system allows users to report technical issues, player problems, and other concerns while implementing proper rate limiting and abuse prevention measures. Reports are managed through the admin dashboard with proper categorization and tracking.

## System Requirements

### Interface Requirements
- **Report Button Location**: Positioned near the notification bell icon in main navigation
- **Clean Form Interface**: Accessible and user-friendly reporting form
- **Rate Limiting**: Maximum 3 reports per user per day
- **Admin Integration**: Reports displayed in Users tab of admin dashboard

### Reporting Categories
1. **Technical Issues**: App bugs, performance problems, feature malfunctions
2. **Player Issues**: Last-minute cancellations, no-shows (with player name field)
3. **Other General Issues**: Miscellaneous concerns and feedback

## Database Schema

### Reports Table
```sql
CREATE TABLE user_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('technical', 'player', 'other')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  player_name TEXT, -- Optional, for player-related reports
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  admin_notes TEXT,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_user_reports_user_id ON user_reports(user_id);
CREATE INDEX idx_user_reports_status ON user_reports(status);
CREATE INDEX idx_user_reports_category ON user_reports(category);
CREATE INDEX idx_user_reports_created_at ON user_reports(created_at DESC);
CREATE INDEX idx_user_reports_priority ON user_reports(priority);
```

### Rate Limiting Table
```sql
CREATE TABLE user_report_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  report_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, report_date)
);

-- Index for rate limiting queries
CREATE INDEX idx_user_report_limits_user_date ON user_report_limits(user_id, report_date);
```

## Backend Implementation

### 1. Report Service
```javascript
// src/services/reportService.js
import { supabase } from './supabase';

class ReportService {
  // Check if user can submit more reports today
  async canUserReport(userId) {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('user_report_limits')
        .select('report_count')
        .eq('user_id', userId)
        .eq('report_date', today)
        .single();

      if (error && error.code !== 'PGRST116') { // Not found is OK
        throw error;
      }

      const currentCount = data?.report_count || 0;
      return {
        canReport: currentCount < 3,
        remainingReports: Math.max(0, 3 - currentCount),
        currentCount
      };
    } catch (error) {
      console.error('Error checking report limit:', error);
      throw error;
    }
  }

  // Submit a new report
  async submitReport(userId, reportData) {
    try {
      // Check rate limit first
      const limitCheck = await this.canUserReport(userId);
      if (!limitCheck.canReport) {
        throw new Error('Daily report limit reached (3 reports per day)');
      }

      // Validate required fields
      if (!reportData.category || !reportData.title || !reportData.description) {
        throw new Error('Missing required fields');
      }

      // Insert the report
      const { data: report, error: reportError } = await supabase
        .from('user_reports')
        .insert({
          user_id: userId,
          category: reportData.category,
          title: reportData.title,
          description: reportData.description,
          player_name: reportData.playerName || null,
          priority: this.calculatePriority(reportData.category)
        })
        .select(`
          *,
          user:users(full_name, email, username)
        `)
        .single();

      if (reportError) throw reportError;

      // Update rate limiting
      await this.updateReportLimit(userId);

      // Send notification to admins
      await this.notifyAdmins(report);

      return { success: true, data: report };
    } catch (error) {
      console.error('Error submitting report:', error);
      return { success: false, error: error.message };
    }
  }

  // Update user's daily report count
  async updateReportLimit(userId) {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { error } = await supabase
        .from('user_report_limits')
        .upsert({
          user_id: userId,
          report_date: today,
          report_count: 1
        }, {
          onConflict: 'user_id,report_date',
          ignoreDuplicates: false
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error updating report limit:', error);
      throw error;
    }
  }

  // Calculate priority based on category
  calculatePriority(category) {
    switch (category) {
      case 'technical':
        return 'high'; // Technical issues need quick attention
      case 'player':
        return 'medium'; // Player issues are important but not urgent
      case 'other':
        return 'low'; // General feedback is lower priority
      default:
        return 'medium';
    }
  }

  // Notify admins of new report
  async notifyAdmins(report) {
    try {
      // Get admin users (you might have a different way to identify admins)
      const { data: admins } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'admin'); // Assuming you have a role field

      if (admins && admins.length > 0) {
        const notifications = admins.map(admin => ({
          user_id: admin.id,
          type: 'new_report',
          title: 'New User Report',
          content: `New ${report.category} report: ${report.title}`,
          data: { reportId: report.id, category: report.category },
          is_read: false
        }));

        await supabase
          .from('notifications')
          .insert(notifications);
      }
    } catch (error) {
      console.error('Error notifying admins:', error);
      // Don't throw here - report submission should succeed even if notification fails
    }
  }

  // Get reports for admin dashboard
  async getReports(filters = {}) {
    try {
      let query = supabase
        .from('user_reports')
        .select(`
          *,
          user:users(full_name, email, username, avatar_url),
          resolver:resolved_by(full_name)
        `)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.category) {
        query = query.eq('category', filters.category);
      }
      if (filters.priority) {
        query = query.eq('priority', filters.priority);
      }
      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;
      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error('Error fetching reports:', error);
      return { success: false, error: error.message };
    }
  }

  // Update report status
  async updateReportStatus(reportId, status, adminNotes = '', resolvedBy = null) {
    try {
      const updateData = {
        status,
        admin_notes: adminNotes,
        updated_at: new Date().toISOString()
      };

      if (status === 'resolved' || status === 'closed') {
        updateData.resolved_by = resolvedBy;
        updateData.resolved_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('user_reports')
        .update(updateData)
        .eq('id', reportId)
        .select()
        .single();

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error('Error updating report status:', error);
      return { success: false, error: error.message };
    }
  }

  // Get user's report history
  async getUserReports(userId) {
    try {
      const { data, error } = await supabase
        .from('user_reports')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error('Error fetching user reports:', error);
      return { success: false, error: error.message };
    }
  }
}

export const reportService = new ReportService();
```

## Frontend Components

### 1. Report Button Component
```jsx
// src/components/reporting/ReportButton.jsx
import React, { useState } from 'react';
import { IconButton, Badge, Tooltip } from '@mui/material';
import ReportIcon from '@mui/icons-material/Report';
import ReportDialog from './ReportDialog';

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
      <Tooltip title="Report an Issue">
        <IconButton
          color="inherit"
          onClick={handleOpenDialog}
          aria-label="report issue"
          sx={{
            ml: 1,
            '&:hover': {
              backgroundColor: 'rgba(255, 152, 0, 0.1)',
            }
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
```

### 2. Report Dialog Component
```jsx
// src/components/reporting/ReportDialog.jsx
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
  CircularProgress
} from '@mui/material';
import { useAuth } from '../../hooks/useAuth';
import { reportService } from '../../services/reportService';
import { useToast } from '../../hooks/useToast';

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

  // Check rate limit when dialog opens
  useEffect(() => {
    if (open && user) {
      checkRateLimit();
    }
  }, [open, user]);

  const checkRateLimit = async () => {
    try {
      const result = await reportService.canUserReport(user.id);
      setRateLimitInfo(result);
    } catch (error) {
      console.error('Error checking rate limit:', error);
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
    }
    if (!formData.description.trim()) {
      newErrors.description = 'Please enter a description';
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
        showSuccessToast('Report submitted successfully');
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

  // Don't render if user can't report
  if (rateLimitInfo && !rateLimitInfo.canReport) {
    return (
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>Report Limit Reached</DialogTitle>
        <DialogContent>
          <Alert severity="warning">
            You have reached your daily report limit (3 reports per day). 
            Please try again tomorrow.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Report an Issue
        {rateLimitInfo && (
          <Typography variant="caption" display="block" color="text.secondary">
            {rateLimitInfo.remainingReports} reports remaining today
          </Typography>
        )}
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
          {/* Category Selection */}
          <FormControl fullWidth error={!!errors.category}>
            <InputLabel>Category</InputLabel>
            <Select
              value={formData.category}
              onChange={handleInputChange('category')}
              label="Category"
            >
              <MenuItem value="technical">Technical Issues</MenuItem>
              <MenuItem value="player">Player Issues</MenuItem>
              <MenuItem value="other">Other General Issues</MenuItem>
            </Select>
            {errors.category && (
              <Typography variant="caption" color="error">
                {errors.category}
              </Typography>
            )}
          </FormControl>

          {/* Title */}
          <TextField
            fullWidth
            label="Title"
            value={formData.title}
            onChange={handleInputChange('title')}
            error={!!errors.title}
            helperText={errors.title}
            placeholder="Brief description of the issue"
          />

          {/* Player Name (only for player issues) */}
          {formData.category === 'player' && (
            <TextField
              fullWidth
              label="Player Name"
              value={formData.playerName}
              onChange={handleInputChange('playerName')}
              error={!!errors.playerName}
              helperText={errors.playerName || "Enter the name of the player you're reporting"}
              placeholder="Player's full name or username"
            />
          )}

          {/* Description */}
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Description"
            value={formData.description}
            onChange={handleInputChange('description')}
            error={!!errors.description}
            helperText={errors.description || "Please provide detailed information about the issue"}
            placeholder="Describe the issue in detail..."
          />

          {/* Category-specific help text */}
          {formData.category && (
            <Alert severity="info">
              {formData.category === 'technical' && 
                "Please include steps to reproduce the issue, device information, and any error messages you saw."}
              {formData.category === 'player' && 
                "Please provide specific details about the player's behavior and when it occurred."}
              {formData.category === 'other' && 
                "Please provide as much detail as possible about your concern or feedback."}
            </Alert>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !formData.category || !formData.title || !formData.description}
          startIcon={loading && <CircularProgress size={20} />}
        >
          Submit Report
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReportDialog;
```

## Admin Dashboard Integration

### Enhanced Users Tab with Reports
```jsx
// Enhanced UsersTab component in AdminDashboard.jsx
const UsersTab = ({ data }) => {
  const [selectedSubTab, setSelectedSubTab] = useState(0);
  const [reports, setReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [reportFilters, setReportFilters] = useState({
    status: 'all',
    category: 'all',
    priority: 'all'
  });

  useEffect(() => {
    loadReports();
  }, [reportFilters]);

  const loadReports = async () => {
    setReportsLoading(true);
    try {
      const filters = {};
      if (reportFilters.status !== 'all') filters.status = reportFilters.status;
      if (reportFilters.category !== 'all') filters.category = reportFilters.category;
      if (reportFilters.priority !== 'all') filters.priority = reportFilters.priority;

      const result = await reportService.getReports(filters);
      if (result.success) {
        setReports(result.data);
      }
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setReportsLoading(false);
    }
  };

  const handleStatusUpdate = async (reportId, newStatus, adminNotes = '') => {
    try {
      const result = await reportService.updateReportStatus(
        reportId, 
        newStatus, 
        adminNotes, 
        user?.id
      );
      
      if (result.success) {
        await loadReports(); // Refresh the list
        showSuccessToast('Report status updated');
      }
    } catch (error) {
      showErrorToast('Failed to update report status');
    }
  };

  return (
    <Box>
      {/* Sub-tab Navigation */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={selectedSubTab} onChange={(e, newValue) => setSelectedSubTab(newValue)}>
          <Tab label="User Analytics" />
          <Tab label="User Reports" />
        </Tabs>
      </Box>

      {selectedSubTab === 0 && (
        <Typography>User analytics will be displayed here</Typography>
      )}

      {selectedSubTab === 1 && (
        <ReportsManagement
          reports={reports}
          loading={reportsLoading}
          filters={reportFilters}
          onFiltersChange={setReportFilters}
          onStatusUpdate={handleStatusUpdate}
          onRefresh={loadReports}
        />
      )}
    </Box>
  );
};
```

## Implementation Roadmap

### Phase 1: Database Setup (Week 1)
1. **Create Database Tables**: Implement reports and rate limiting tables
2. **Add Indexes**: Optimize for admin dashboard queries
3. **Create Migration Scripts**: Ensure proper database setup

### Phase 2: Backend Implementation (Week 2)
1. **Report Service**: Implement complete report management service
2. **Rate Limiting**: Add proper abuse prevention
3. **Admin Notifications**: Notify admins of new reports

### Phase 3: Frontend Components (Week 3)
1. **Report Button**: Add to main navigation
2. **Report Dialog**: Implement comprehensive reporting form
3. **Admin Dashboard**: Enhance Users tab with report management

### Phase 4: Testing & Polish (Week 4)
1. **Rate Limiting Testing**: Verify 3-reports-per-day limit
2. **Admin Workflow Testing**: Test complete report lifecycle
3. **UI/UX Polish**: Ensure smooth user experience

## Success Metrics

### Usage Metrics
- **Report Submission Rate**: Target 5% of daily active users
- **Resolution Time**: Target 24-48 hours for high priority reports
- **User Satisfaction**: Target 85% positive feedback on resolution

### System Metrics
- **Rate Limiting Effectiveness**: Target <1% abuse attempts
- **Admin Response Time**: Target 90% of reports acknowledged within 4 hours
- **System Performance**: Target <200ms for report submission

## Conclusion

This comprehensive reporting system provides users with an easy way to report issues while protecting against abuse through proper rate limiting. The admin dashboard integration ensures efficient report management and resolution tracking.
