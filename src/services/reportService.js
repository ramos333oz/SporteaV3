import { supabase } from './supabase';
import { notificationService } from './notifications';

/**
 * Report Service
 * Handles user reporting functionality with rate limiting and admin management
 */
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

      // Validate category-specific requirements
      if (reportData.category === 'player' && !reportData.playerName?.trim()) {
        throw new Error('Player name is required for player reports');
      }

      // Insert the report
      const { data: report, error: reportError } = await supabase
        .from('user_reports')
        .insert({
          user_id: userId,
          category: reportData.category,
          title: reportData.title.trim(),
          description: reportData.description.trim(),
          player_name: reportData.playerName?.trim() || null,
          priority: this.calculatePriority(reportData.category)
        })
        .select(`
          *,
          user:users!user_id(full_name, email, username)
        `)
        .single();

      if (reportError) throw reportError;

      // Update rate limiting manually for now
      try {
        const today = new Date().toISOString().split('T')[0];
        const { error: limitError } = await supabase
          .from('user_report_limits')
          .upsert({
            user_id: userId,
            report_date: today,
            report_count: 1
          }, {
            onConflict: 'user_id,report_date',
            ignoreDuplicates: false
          });

        if (limitError) {
          console.error('Error updating report limit:', limitError);
        }
      } catch (limitError) {
        console.error('Error updating report limit:', limitError);
        // Don't throw here - report was successful, limit update is secondary
      }

      console.log(`Report submitted successfully by user ${userId}:`, report);
      return { success: true, data: report };
    } catch (error) {
      console.error('Error submitting report:', error);
      return { success: false, error: error.message };
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

  // Get reports for admin dashboard
  async getReports(filters = {}) {
    try {
      let query = supabase
        .from('admin_reports_view')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters.category && filters.category !== 'all') {
        query = query.eq('category', filters.category);
      }
      if (filters.priority && filters.priority !== 'all') {
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

  // Update report status (admin only)
  async updateReportStatus(reportId, status, adminNotes = '', resolvedBy = null) {
    try {
      // First, get the current report data to access user_id and title
      const { data: currentReport, error: fetchError } = await supabase
        .from('user_reports')
        .select('user_id, title, status')
        .eq('id', reportId)
        .single();

      if (fetchError) throw fetchError;

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

      // Send notification to user when status changes
      await this.sendStatusUpdateNotification(currentReport, status, adminNotes);

      console.log(`Report ${reportId} status updated to ${status} by ${resolvedBy}`);
      return { success: true, data };
    } catch (error) {
      console.error('Error updating report status:', error);
      return { success: false, error: error.message };
    }
  }

  // Send notification to user when inquiry status changes
  async sendStatusUpdateNotification(report, newStatus, adminNotes = '') {
    try {
      let notificationData = null;

      // Send notification for specific status transitions
      if (newStatus === 'in_progress') {
        notificationData = {
          user_id: report.user_id,
          type: 'inquiry_processing',
          title: 'Inquiry Being Processed',
          content: `Your inquiry "${report.title}" is now being reviewed by our admin team. We'll update you once it's resolved.`
        };
      } else if (newStatus === 'resolved') {
        let content = `Your inquiry "${report.title}" has been resolved.`;
        if (adminNotes && adminNotes.trim()) {
          content += ` Admin note: ${adminNotes.trim()}`;
        }

        notificationData = {
          user_id: report.user_id,
          type: 'inquiry_resolved',
          title: 'Inquiry Resolved',
          content: content
        };
      }

      // Send the notification if we have data
      if (notificationData) {
        const result = await notificationService.createNotification(notificationData);
        if (result.success) {
          console.log(`Notification sent to user ${report.user_id} for status change to ${newStatus}`);
        } else {
          console.error('Failed to send notification:', result.error);
        }
      }
    } catch (error) {
      console.error('Error sending status update notification:', error);
      // Don't throw here - notification failure shouldn't prevent status update
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

  // Get report statistics for admin dashboard
  async getReportStatistics() {
    try {
      // Get total counts by status
      const { data: statusCounts, error: statusError } = await supabase
        .from('user_reports')
        .select('status')
        .then(({ data, error }) => {
          if (error) throw error;
          
          const counts = data.reduce((acc, report) => {
            acc[report.status] = (acc[report.status] || 0) + 1;
            return acc;
          }, {});
          
          return { data: counts, error: null };
        });

      if (statusError) throw statusError;

      // Get counts by category
      const { data: categoryCounts, error: categoryError } = await supabase
        .from('user_reports')
        .select('category')
        .then(({ data, error }) => {
          if (error) throw error;
          
          const counts = data.reduce((acc, report) => {
            acc[report.category] = (acc[report.category] || 0) + 1;
            return acc;
          }, {});
          
          return { data: counts, error: null };
        });

      if (categoryError) throw categoryError;

      // Get recent activity (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: recentReports, error: recentError } = await supabase
        .from('user_reports')
        .select('created_at')
        .gte('created_at', sevenDaysAgo.toISOString())
        .then(({ data, error }) => {
          if (error) throw error;
          return { data: data.length, error: null };
        });

      if (recentError) throw recentError;

      return {
        success: true,
        data: {
          statusCounts,
          categoryCounts,
          recentReports,
          totalReports: Object.values(statusCounts).reduce((sum, count) => sum + count, 0)
        }
      };
    } catch (error) {
      console.error('Error fetching report statistics:', error);
      return { success: false, error: error.message };
    }
  }

  // Delete report (admin only, soft delete by changing status)
  async deleteReport(reportId, adminId) {
    try {
      const { data, error } = await supabase
        .from('user_reports')
        .update({
          status: 'closed',
          admin_notes: 'Report deleted by admin',
          resolved_by: adminId,
          resolved_at: new Date().toISOString()
        })
        .eq('id', reportId)
        .select()
        .single();

      if (error) throw error;

      console.log(`Report ${reportId} deleted by admin ${adminId}`);
      return { success: true, data };
    } catch (error) {
      console.error('Error deleting report:', error);
      return { success: false, error: error.message };
    }
  }

  // Get report categories and their descriptions
  getReportCategories() {
    return [
      {
        value: 'technical',
        label: 'Technical Issues',
        description: 'App bugs, performance problems, feature malfunctions',
        examples: ['App crashes', 'Slow loading', 'Features not working', 'Login issues']
      },
      {
        value: 'player',
        label: 'Player Issues',
        description: 'Problems with other users behavior',
        examples: ['Last-minute cancellations', 'No-shows', 'Inappropriate behavior', 'Fake profiles']
      },
      {
        value: 'other',
        label: 'Other General Issues',
        description: 'Miscellaneous concerns and feedback',
        examples: ['Feature requests', 'General feedback', 'Content issues', 'Other concerns']
      }
    ];
  }
}

export const reportService = new ReportService();
export default reportService;
