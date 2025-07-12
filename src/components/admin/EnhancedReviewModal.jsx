import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Chip,
  Divider,
  TextField,
  Alert,
  CircularProgress,
  Avatar,
  Link,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Warning as WarningIcon,
  Person as PersonIcon,
  LocationOn as LocationIcon,
  Schedule as ScheduleIcon,
  Sports as SportsIcon,
  Flag as FlagIcon,
  Close as CloseIcon,
  OpenInNew as OpenInNewIcon
} from '@mui/icons-material';
import { getMatchReviewDetails, approveMatch, rejectMatch } from '../../services/contentModerationService';

const EnhancedReviewModal = ({ open, onClose, queueId, adminUser, onActionComplete }) => {
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reviewData, setReviewData] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [rejectReason, setRejectReason] = useState('Content violates community guidelines');

  useEffect(() => {
    if (open && queueId) {
      loadReviewData();
    }
  }, [open, queueId]);

  const loadReviewData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await getMatchReviewDetails(queueId);
      
      if (result.success) {
        setReviewData(result.data);
      } else {
        setError(result.error);
      }
    } catch (error) {
      console.error('Error loading review data:', error);
      setError('Failed to load review data');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    try {
      setActionLoading(true);
      
      const result = await approveMatch(queueId, adminUser.id, adminNotes);
      
      if (result.success) {
        onActionComplete('approve', result.message);
        onClose();
      } else {
        setError(result.error);
      }
    } catch (error) {
      console.error('Error approving match:', error);
      setError('Failed to approve match');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    try {
      setActionLoading(true);
      
      const result = await rejectMatch(queueId, adminUser.id, rejectReason, adminNotes);
      
      if (result.success) {
        onActionComplete('reject', result.message);
        onClose();
      } else {
        setError(result.error);
      }
    } catch (error) {
      console.error('Error rejecting match:', error);
      setError('Failed to reject match');
    } finally {
      setActionLoading(false);
      setShowRejectConfirm(false);
    }
  };

  const handleClose = () => {
    setAdminNotes('');
    setRejectReason('Content violates community guidelines');
    setShowRejectConfirm(false);
    setError(null);
    onClose();
  };

  const getRiskLevelColor = (riskLevel) => {
    switch (riskLevel) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'success';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      default: return 'default';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const formatScore = (score) => {
    return score ? (score * 100).toFixed(1) + '%' : 'N/A';
  };

  if (!open) return null;

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="lg" 
      fullWidth
      PaperProps={{
        sx: { minHeight: '80vh' }
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" component="div">
          Enhanced Content Review
        </Typography>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : reviewData ? (
          <Grid container spacing={3}>
            {/* Match Details Section */}
            <Grid item xs={12} md={8}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                    <SportsIcon sx={{ mr: 1 }} />
                    Match Details
                  </Typography>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="h5" gutterBottom>
                      {reviewData.match?.title}
                    </Typography>
                    <Typography variant="body1" paragraph>
                      {reviewData.match?.description}
                    </Typography>
                  </Box>

                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <SportsIcon sx={{ mr: 1, color: 'text.secondary' }} />
                        <Typography variant="body2">
                          <strong>Sport:</strong> {reviewData.match?.sport?.name}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <LocationIcon sx={{ mr: 1, color: 'text.secondary' }} />
                        <Typography variant="body2">
                          <strong>Location:</strong> {reviewData.match?.location?.name}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <ScheduleIcon sx={{ mr: 1, color: 'text.secondary' }} />
                        <Typography variant="body2">
                          <strong>Date & Time:</strong> {formatDate(reviewData.match?.date_time)}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2">
                        <strong>Created:</strong> {formatDate(reviewData.match?.created_at)}
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* Host Information Section */}
              <Card sx={{ mt: 2 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                    <PersonIcon sx={{ mr: 1 }} />
                    Host Information
                  </Typography>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar 
                      src={reviewData.match?.host?.avatar_url} 
                      sx={{ width: 56, height: 56 }}
                    >
                      {reviewData.match?.host?.full_name?.charAt(0)}
                    </Avatar>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="h6">
                        {reviewData.match?.host?.full_name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {reviewData.match?.host?.email}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Faculty: {reviewData.match?.host?.faculty || 'Not specified'}
                      </Typography>
                    </Box>
                    <Tooltip title="View Host Profile">
                      <IconButton 
                        component={Link} 
                        href={`/profile/${reviewData.match?.host?.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <OpenInNewIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Moderation Analysis Section */}
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                    <FlagIcon sx={{ mr: 1 }} />
                    Moderation Analysis
                  </Typography>

                  {/* Risk Level and Priority */}
                  <Box sx={{ mb: 2 }}>
                    <Chip 
                      label={`${reviewData.priority?.toUpperCase()} PRIORITY`}
                      color={getPriorityColor(reviewData.priority)}
                      size="small"
                      sx={{ mr: 1, mb: 1 }}
                    />
                    <Chip 
                      label={`${reviewData.moderation_result?.overall_risk_level?.toUpperCase()} RISK`}
                      color={getRiskLevelColor(reviewData.moderation_result?.overall_risk_level)}
                      size="small"
                      sx={{ mb: 1 }}
                    />
                  </Box>

                  {/* Scores */}
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" gutterBottom>
                      <strong>Toxic Score:</strong> {formatScore(reviewData.moderation_result?.inappropriate_score)}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      <strong>Consistency Score:</strong> {formatScore(reviewData.moderation_result?.consistency_score)}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      <strong>Sports Validation:</strong> {formatScore(reviewData.moderation_result?.sports_validation_score)}
                    </Typography>
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  {/* Flagged Content */}
                  {reviewData.moderation_result?.flagged_content?.toxic_words?.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" gutterBottom color="error">
                        Flagged Words:
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {reviewData.moderation_result.flagged_content.toxic_words.map((word, index) => (
                          <Chip 
                            key={index}
                            label={word}
                            size="small"
                            color="error"
                            variant="outlined"
                          />
                        ))}
                      </Box>
                    </Box>
                  )}

                  {/* Risk Factors */}
                  {reviewData.moderation_result?.flagged_content?.risk_factors && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Risk Factors:
                      </Typography>
                      <List dense>
                        {Object.entries(reviewData.moderation_result.flagged_content.risk_factors).map(([factor, value]) => (
                          value && (
                            <ListItem key={factor} sx={{ py: 0 }}>
                              <ListItemIcon sx={{ minWidth: 20 }}>
                                <WarningIcon fontSize="small" color="warning" />
                              </ListItemIcon>
                              <ListItemText 
                                primary={factor.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                primaryTypographyProps={{ variant: 'body2' }}
                              />
                            </ListItem>
                          )
                        ))}
                      </List>
                    </Box>
                  )}

                  {/* Processing Details */}
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="body2" color="text.secondary">
                    <strong>Queued:</strong> {formatDate(reviewData.created_at)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Processing Time:</strong> {reviewData.moderation_result?.processing_time_ms}ms
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>System Version:</strong> {reviewData.moderation_result?.model_confidence?.system_version}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Admin Notes Section */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Admin Notes
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Add notes about your decision (optional)..."
                    variant="outlined"
                  />
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        ) : null}
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={handleClose} disabled={actionLoading}>
          Cancel
        </Button>
        
        {reviewData && (
          <>
            <Button
              variant="contained"
              color="success"
              onClick={handleApprove}
              disabled={actionLoading}
              startIcon={actionLoading ? <CircularProgress size={16} /> : null}
            >
              Approve
            </Button>
            
            <Button
              variant="contained"
              color="error"
              onClick={() => setShowRejectConfirm(true)}
              disabled={actionLoading}
            >
              Reject
            </Button>
          </>
        )}
      </DialogActions>

      {/* Reject Confirmation Dialog */}
      <Dialog open={showRejectConfirm} onClose={() => setShowRejectConfirm(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Confirm Rejection</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This action will permanently reject the match and remove it from public listings. 
            The host will be notified with the reason for rejection.
          </Alert>
          
          <TextField
            fullWidth
            label="Rejection Reason"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            multiline
            rows={3}
            variant="outlined"
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowRejectConfirm(false)} disabled={actionLoading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleReject}
            disabled={actionLoading || !rejectReason.trim()}
            startIcon={actionLoading ? <CircularProgress size={16} /> : null}
          >
            Confirm Rejection
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
};

export default EnhancedReviewModal;
