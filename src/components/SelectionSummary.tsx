import React, { useState, useEffect } from 'react';
import { EventBus, EVENTS } from '../utils/events';
import { LocalStorage, type SelectedSubtitle } from '../utils/storage';
import SecurityModal from './SecurityModal';

const SelectionSummary: React.FC = () => {
  const [selectedSubtitles, setSelectedSubtitles] = useState<SelectedSubtitle[]>([]);
  const [downloading, setDownloading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);

  useEffect(() => {
    // Load initial selection
    const saved = LocalStorage.getSelectedSubtitles();
    setSelectedSubtitles(saved);

    // Listen for selection changes
    const handleSubtitleSelected = () => {
      const updated = LocalStorage.getSelectedSubtitles();
      setSelectedSubtitles(updated);
    };

    const handleSelectionCleared = () => {
      setSelectedSubtitles([]);
    };

    EventBus.on(EVENTS.SUBTITLE_SELECTED, handleSubtitleSelected);
    EventBus.on(EVENTS.SELECTION_CLEARED, handleSelectionCleared);

    return () => {
      EventBus.off(EVENTS.SUBTITLE_SELECTED, handleSubtitleSelected);
      EventBus.off(EVENTS.SELECTION_CLEARED, handleSelectionCleared);
    };
  }, []);

  const handleRemoveSubtitle = (fileId: number) => {
    LocalStorage.removeSelectedSubtitle(fileId);
    const updated = LocalStorage.getSelectedSubtitles();
    setSelectedSubtitles(updated);

    // Emit the removal event so SubtitleList can uncheck the checkbox
    EventBus.emit(EVENTS.SUBTITLE_REMOVED, {
      fileId,
      totalSelected: updated.length,
    });

    EventBus.emit(EVENTS.SHOW_TOAST, {
      message: 'Subtitle removed from selection',
      type: 'info',
    });
  };

  const handleClearSelection = () => {
    LocalStorage.clearSelectedSubtitles();
    setSelectedSubtitles([]);
    EventBus.emit(EVENTS.SELECTION_CLEARED);
    EventBus.emit(EVENTS.SHOW_TOAST, {
      message: 'Selection cleared',
      type: 'info',
    });
  };

  const handleDownloadClick = () => {
    if (selectedSubtitles.length === 0) {
      EventBus.emit(EVENTS.SHOW_TOAST, {
        message: 'No subtitles selected',
        type: 'error',
      });
      return;
    }

    setShowSecurityModal(true);
  };

  // Helper function to extract filename from Content-Disposition header
  const extractFilename = (contentDisposition: string): string => {
    const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
    if (filenameMatch && filenameMatch[1]) {
      // Remove quotes if present
      return filenameMatch[1].replace(/['"]/g, '');
    }
    return 'download';
  };

  // Helper function to determine if response is a single file
  const isSingleFile = (contentType: string): boolean => {
    return contentType.includes('text/plain');
  };

  // Helper function to generate fallback filename
  const generateFallbackFilename = (isZip: boolean, count: number): string => {
    if (isZip) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      return `subtitles_${timestamp}.zip`;
    } else {
      return `subtitle_${Date.now()}.srt`;
    }
  };

  const handleSecurityConfirm = async (securityKey: string) => {
    setDownloading(true);
    try {
      const fileIds = selectedSubtitles.map(s => s.file_id);
      
      const response = await fetch('/api/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          fileIds,
          securityKey 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Download failed');
      }

      // Get response headers
      const contentType = response.headers.get('Content-Type') || '';
      const contentDisposition = response.headers.get('Content-Disposition') || '';
      const downloadResults = response.headers.get('X-Download-Results');
      
      // Parse download results
      let resultsInfo = null;
      if (downloadResults) {
        try {
          resultsInfo = JSON.parse(downloadResults);
        } catch (e) {
          console.warn('Could not parse download results');
        }
      }

      // Determine filename
      let filename: string;
      const isSingle = isSingleFile(contentType);
      
      if (contentDisposition) {
        filename = extractFilename(contentDisposition);
      } else {
        filename = generateFallbackFilename(!isSingle, selectedSubtitles.length);
      }

      // Create download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Update quota info if available
      if (resultsInfo?.quota) {
        const quotaInfo = {
          remaining_downloads: resultsInfo.quota.remaining,
          last_updated: new Date().toISOString(),
          recharge_date: resultsInfo.quota.reset_time_utc,
        };
        LocalStorage.setQuotaInfo(quotaInfo);
      }

      // Show appropriate success message
      let message: string;
      if (resultsInfo) {
        if (isSingle && resultsInfo.successful === 1) {
          message = `Subtitle downloaded successfully`;
        } else {
          message = `Downloaded ${resultsInfo.successful}/${resultsInfo.total} subtitles successfully`;
        }
      } else {
        message = isSingle 
          ? `Subtitle downloaded successfully`
          : `Downloaded ${selectedSubtitles.length} subtitles`;
      }
      
      EventBus.emit(EVENTS.SHOW_TOAST, {
        message,
        type: 'success',
      });

      setShowSecurityModal(false);

    } catch (error) {
      console.error('Download error:', error);
      EventBus.emit(EVENTS.SHOW_TOAST, {
        message: error instanceof Error ? error.message : 'Download failed. Please try again.',
        type: 'error',
      });
    } finally {
      setDownloading(false);
    }
  };

  const handleSecurityCancel = () => {
    setShowSecurityModal(false);
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Selected Subtitles
        </h2>
        
        <div className="mb-4">
          <div className="text-2xl font-bold text-blue-600">
            {selectedSubtitles.length}
          </div>
          <div className="text-sm text-gray-500">
            subtitle{selectedSubtitles.length !== 1 ? 's' : ''} selected
          </div>
        </div>

        {selectedSubtitles.length > 0 && (
          <div className="mb-4">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-sm text-blue-600 hover:text-blue-800 focus:outline-none"
            >
              {showDetails ? 'Hide Details' : 'Show Details'}
            </button>
          </div>
        )}

        {showDetails && selectedSubtitles.length > 0 && (
          <div className="mb-4 max-h-64 overflow-y-auto">
            <div className="space-y-2">
              {selectedSubtitles.map((subtitle) => (
                <div key={subtitle.file_id} className="p-2 bg-gray-50 rounded text-xs">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">
                        {subtitle.subtitle_info.title} ({subtitle.subtitle_info.year})
                      </div>
                      <div className="text-gray-600 truncate">
                        {subtitle.file_name}
                      </div>
                      <div className="text-gray-500">
                        {subtitle.subtitle_info.language} • CD {subtitle.cd_number}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveSubtitle(subtitle.file_id)}
                      className="ml-2 text-red-500 hover:text-red-700 focus:outline-none"
                      title="Remove from selection"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="space-y-3">
          <button
            onClick={handleDownloadClick}
            disabled={selectedSubtitles.length === 0 || downloading}
            className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {downloading ? 'Downloading...' : 'Download All'}
          </button>
          
          <button
            onClick={handleClearSelection}
            disabled={selectedSubtitles.length === 0}
            className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Clear Selection
          </button>
        </div>
        
        {selectedSubtitles.length > 0 && (
          <div className="mt-4 p-3 bg-blue-50 rounded-md">
            <p className="text-xs text-blue-700">
              Selected subtitles are saved locally and will persist across searches.
            </p>
          </div>
        )}
      </div>

      <SecurityModal
        isOpen={showSecurityModal}
        onClose={handleSecurityCancel}
        onConfirm={handleSecurityConfirm}
        loading={downloading}
      />
    </>
  );
};

export default SelectionSummary;