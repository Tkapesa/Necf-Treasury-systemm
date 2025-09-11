import React, { useState, useEffect } from 'react';
import {
  DownloadIcon,
  RefreshCwIcon,
  TrashIcon,
  MailIcon,
  PlusIcon,
  FileTextIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  InfoIcon,
  ClockIcon,
  LoaderIcon
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../api/client';
import toast from 'react-hot-toast';

interface Report {
  month: string;
  month_name: string;
  year: number;
  status: 'available' | 'not_generated' | 'generating' | 'error';
  download_url?: string;
  report_path?: string;
  generated_at?: string;
  size?: number;
}

interface ReportGenerationResult {
  status: string;
  message: string;
  report_url: string;
  report_path: string;
  cached: boolean;
  month: string;
  generated_at: string;
  summary: {
    total_receipts: number;
    total_amount: number;
    vendor_count: number;
    category_count: number;
  };
  receipts_count: number;
}

const Reports: React.FC = () => {
  const { user } = useAuth();
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  
  // Email dialog state
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailReport, setEmailReport] = useState<Report | null>(null);
  const [emailRecipients, setEmailRecipients] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  
  // Settings
  const [forceRegenerate, setForceRegenerate] = useState(false);
  
  // Available years (last 5 years)
  const currentYear = new Date().getFullYear();
  const availableYears = Array.from({ length: 5 }, (_, i) => currentYear - i);
  
  // Month options
  const months = [
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' }
  ];

  // Check if user is admin
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (isAdmin) {
      loadReports();
    }
  }, [selectedYear, isAdmin]);

  const loadReports = async () => {
    if (!isAdmin) return;
    
    setLoading(true);
    
    try {
      const response = await apiClient.get<{ reports: Report[] }>(`/reports/monthly/list?year=${selectedYear}`);
      setReports(response.reports || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load reports');
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    if (!selectedMonth || !isAdmin) return;
    
    const monthKey = `${selectedYear}-${selectedMonth}`;
    setGenerating(monthKey);
    
    try {
      const params = new URLSearchParams({
        month: monthKey,
        force: forceRegenerate.toString()
      });
      
      const response = await apiClient.post<ReportGenerationResult>(`/reports/monthly/generate?${params}`);
      
      toast.success(response.message);
      
      // Update the reports list
      await loadReports();
      
      // Clear selection
      setSelectedMonth('');
      
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate report');
      console.error('Failed to generate report:', err);
    } finally {
      setGenerating(null);
    }
  };

  const downloadReport = async (report: Report) => {
    if (!report.download_url) return;
    
    try {
      const response = await fetch(report.download_url);
      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `monthly_report_${report.month}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success(`Downloaded report for ${report.month_name} ${report.year}`);
    } catch (err) {
      toast.error('Failed to download report');
      console.error('Download failed:', err);
    }
  };

  const deleteReport = async (report: Report) => {
    if (!window.confirm(`Delete report for ${report.month_name} ${report.year}?`)) {
      return;
    }
    
    try {
      await apiClient.delete(`/reports/monthly/${report.month}`);
      toast.success(`Deleted report for ${report.month_name} ${report.year}`);
      await loadReports();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete report');
      console.error('Failed to delete report:', err);
    }
  };

  const openEmailDialog = (report: Report) => {
    setEmailReport(report);
    setEmailRecipients('');
    setEmailMessage('');
    setEmailDialogOpen(true);
  };

  const sendReportEmail = async () => {
    if (!emailReport || !emailRecipients.trim()) return;
    
    setEmailSending(true);
    
    try {
      const params = new URLSearchParams({
        recipients: emailRecipients.trim(),
        ...(emailMessage.trim() && { message: emailMessage.trim() })
      });
      
      const response = await apiClient.post<any>(`/reports/monthly/${emailReport.month}/email?${params}`);
      
      toast.success(`Email sent successfully to ${response.recipients.length} recipients`);
      setEmailDialogOpen(false);
      
    } catch (err: any) {
      toast.error(err.message || 'Failed to send email');
      console.error('Failed to send email:', err);
    } finally {
      setEmailSending(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircleIcon className="w-4 h-4 mr-1" />
            Available
          </span>
        );
      case 'generating':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <ClockIcon className="w-4 h-4 mr-1" />
            Generating
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <AlertCircleIcon className="w-4 h-4 mr-1" />
            Error
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
            <InfoIcon className="w-4 h-4 mr-1" />
            Not Generated
          </span>
        );
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (!bytes) return '';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircleIcon className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Admin Access Required
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>You need admin privileges to view and manage reports.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen"
      style={{
        backgroundImage: `linear-gradient(rgba(240, 249, 255, 0.85), rgba(240, 249, 255, 0.85)), url(/src/assets/images/backgrounds/Copy%20of%20logo%20REMAKE.png)`,
        backgroundSize: 'contain',
        backgroundPosition: 'center center',
        backgroundRepeat: 'no-repeat',
        backgroundColor: '#f0f9ff'
      }}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-primary-700">PDF Reports</h1>
        <p className="mt-2 text-sm sm:text-base text-secondary-600">
          Generate and manage monthly PDF reports for receipt data. Reports include summary statistics,
          vendor breakdowns, and detailed receipt listings with thumbnails.
        </p>
      </div>

      {/* Generate New Report Section */}
      <div className="bg-white/95 backdrop-blur-sm shadow-soft rounded-lg mb-6 sm:mb-8 border border-primary-200">
        <div className="px-4 sm:px-6 py-4 border-b border-primary-200">
          <div className="flex items-center">
            <FileTextIcon className="h-5 w-5 sm:h-6 sm:w-6 text-primary-600 mr-2 sm:mr-3" />
            <h2 className="text-base sm:text-lg font-medium text-primary-700">Generate New Report</h2>
          </div>
        </div>
        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div className="sm:col-span-1">
              <label htmlFor="year" className="block text-sm font-medium text-primary-700 mb-2">
                Year
              </label>
              <select
                id="year"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="block w-full px-3 py-2 text-sm border border-primary-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              >
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            
            <div className="sm:col-span-1">
              <label htmlFor="month" className="block text-sm font-medium text-gray-700 mb-2">
                Month
              </label>
              <select
                id="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select month...</option>
                {months
                  .filter(month => {
                    // Don't show future months for current year
                    if (selectedYear === currentYear) {
                      return parseInt(month.value) <= new Date().getMonth() + 1;
                    }
                    return true;
                  })
                  .map(month => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
              </select>
            </div>
            
            <div className="sm:col-span-1 lg:col-span-1">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={forceRegenerate}
                  onChange={(e) => setForceRegenerate(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Force Regenerate</span>
              </label>
            </div>
            
            <div className="sm:col-span-2 lg:col-span-1">
              <button
                onClick={generateReport}
                disabled={!selectedMonth || !!generating}
                className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generating ? (
                  <>
                    <LoaderIcon className="w-4 h-4 mr-2 animate-spin" />
                    <span className="hidden sm:inline">Generating...</span>
                    <span className="sm:hidden">...</span>
                  </>
                ) : (
                  <>
                    <PlusIcon className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Generate Report</span>
                    <span className="sm:hidden">Generate</span>
                  </>
                )}
              </button>
            </div>
          </div>
          
          {forceRegenerate && (
            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <div className="flex">
                <AlertCircleIcon className="h-5 w-5 text-yellow-400 flex-shrink-0" />
                <div className="ml-3">
                  <p className="text-sm text-yellow-800">
                    Force regenerate will overwrite existing reports for the selected month.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Available Reports Section */}
      <div className="bg-white/95 backdrop-blur-sm shadow-soft rounded-lg border border-primary-200">
        <div className="px-4 sm:px-6 py-4 border-b border-primary-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
            <h2 className="text-base sm:text-lg font-medium text-primary-700">
              Reports for {selectedYear}
            </h2>
            <button
              onClick={loadReports}
              disabled={loading}
              className="inline-flex items-center px-3 py-1.5 border border-primary-300 shadow-sm text-sm font-medium rounded-md text-primary-700 bg-white hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
            >
              <RefreshCwIcon className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
        
        <div className="divide-y divide-primary-200">
          {loading && (
            <div className="p-4 sm:p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          )}
          
          {reports.length === 0 && !loading && (
            <div className="p-4 sm:p-6">
              <div className="text-center">
                <InfoIcon className="mx-auto h-8 w-8 sm:h-12 sm:w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No reports found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  No reports found for {selectedYear}. Generate your first report above.
                </p>
              </div>
            </div>
          )}
          
          {reports.map((report) => (
            <div key={report.month} className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                    <h3 className="text-base sm:text-lg font-medium text-primary-700 truncate">
                      {report.month_name} {report.year}
                    </h3>
                    {getStatusBadge(report.status)}
                  </div>
                  <div className="mt-1 text-xs sm:text-sm text-gray-500 space-y-1 sm:space-y-0">
                    <div className="flex flex-col sm:flex-row sm:space-x-4">
                      <span>Month: {report.month}</span>
                      {report.generated_at && (
                        <span>
                          Generated: {new Date(report.generated_at).toLocaleDateString()}
                          <span className="hidden sm:inline"> {new Date(report.generated_at).toLocaleTimeString()}</span>
                        </span>
                      )}
                      {report.size && (
                        <span>
                          Size: {formatFileSize(report.size)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                  {report.status === 'available' && (
                    <>
                      <button
                        onClick={() => downloadReport(report)}
                        className="inline-flex items-center justify-center px-3 py-1.5 border border-primary-300 shadow-sm text-sm font-medium rounded-md text-primary-700 bg-white hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                      >
                        <DownloadIcon className="w-4 h-4 mr-1" />
                        <span className="hidden sm:inline">Download</span>
                      </button>
                      
                      <button
                        onClick={() => openEmailDialog(report)}
                        className="inline-flex items-center justify-center px-3 py-1.5 border border-primary-300 shadow-sm text-sm font-medium rounded-md text-primary-700 bg-white hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                      >
                        <MailIcon className="w-4 h-4 mr-1" />
                        <span className="hidden sm:inline">Email</span>
                      </button>
                      
                      <button
                        onClick={() => deleteReport(report)}
                        className="inline-flex items-center justify-center px-3 py-1.5 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        <TrashIcon className="w-4 h-4 mr-1" />
                        <span className="hidden sm:inline">Delete</span>
                      </button>
                    </>
                  )}
                  
                  {report.status === 'generating' && (
                    <div className="flex items-center justify-center py-1.5">
                      <LoaderIcon className="w-6 h-6 text-blue-600 animate-spin" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Email Dialog */}
      {emailDialogOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 p-4">
          <div className="relative top-4 sm:top-20 mx-auto p-4 sm:p-5 border w-full max-w-md sm:max-w-lg shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Email Report: {emailReport?.month_name} {emailReport?.year}
              </h3>
              
              <div className="mb-4">
                <label htmlFor="recipients" className="block text-sm font-medium text-gray-700 mb-2">
                  Recipients *
                </label>
                <input
                  type="text"
                  id="recipients"
                  placeholder="email1@example.com, email2@example.com"
                  value={emailRecipients}
                  onChange={(e) => setEmailRecipients(e.target.value)}
                  className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                <p className="mt-1 text-xs sm:text-sm text-gray-500">Comma-separated email addresses</p>
              </div>
              
              <div className="mb-4">
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                  Message (Optional)
                </label>
                <textarea
                  id="message"
                  rows={4}
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  placeholder="Add a custom message to include with the report..."
                  className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="mb-4 bg-blue-50 border border-blue-200 rounded-md p-3 sm:p-4">
                <div className="flex">
                  <InfoIcon className="h-5 w-5 text-blue-400 flex-shrink-0" />
                  <div className="ml-3">
                    <p className="text-xs sm:text-sm text-blue-800">
                      <strong>Note:</strong> This is a demonstration. In production, integrate with an email service 
                      like SendGrid or AWS SES for actual email delivery.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
                <button
                  onClick={() => setEmailDialogOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  onClick={sendReportEmail}
                  disabled={!emailRecipients.trim() || emailSending}
                  className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {emailSending ? (
                    <>
                      <LoaderIcon className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <MailIcon className="w-4 h-4 mr-2" />
                      Send Email
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default Reports;

