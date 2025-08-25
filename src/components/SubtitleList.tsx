import React, { useState, useEffect } from 'react';
import { EventBus, EVENTS } from '../utils/events';
import { LocalStorage, type SelectedSubtitle } from '../utils/storage';
import type { Subtitle } from '../types/frontend';

const SubtitleList: React.FC = () => {
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [selectedSubtitles, setSelectedSubtitles] = useState<SelectedSubtitle[]>([]);
  const [currentQuery, setCurrentQuery] = useState<string>('');

  useEffect(() => {
    // Load selected subtitles from localStorage
    const saved = LocalStorage.getSelectedSubtitles();
    setSelectedSubtitles(saved);
  
    // Listen for search results
    const handleSearchCompleted = (event: CustomEvent) => {
      const { subtitles, query } = event.detail;
      setSubtitles(subtitles);
      setCurrentQuery(query);
    };
  
    // Listen for selection cleared
    const handleSelectionCleared = () => {
      setSelectedSubtitles([]);
    };
  
    // Listen for individual subtitle removal
    const handleSubtitleRemoved = (event: CustomEvent) => {
      const { fileId } = event.detail;
      setSelectedSubtitles(prev => prev.filter(s => s.file_id !== fileId));
    };
  
    EventBus.on(EVENTS.SEARCH_COMPLETED, handleSearchCompleted);
    EventBus.on(EVENTS.SELECTION_CLEARED, handleSelectionCleared);
    EventBus.on(EVENTS.SUBTITLE_REMOVED, handleSubtitleRemoved); // Add this listener
  
    return () => {
      EventBus.off(EVENTS.SEARCH_COMPLETED, handleSearchCompleted);
      EventBus.off(EVENTS.SELECTION_CLEARED, handleSelectionCleared);
      EventBus.off(EVENTS.SUBTITLE_REMOVED, handleSubtitleRemoved); // Clean up
    };
  }, []);

  const isFileSelected = (fileId: number): boolean => {
    return selectedSubtitles.some(s => s.file_id === fileId);
  };

  const handleSelectSubtitle = (subtitle: Subtitle, file: any) => {
    const fileId = file.file_id;
    const isCurrentlySelected = isFileSelected(fileId);

    if (isCurrentlySelected) {
      // Remove from selection
      LocalStorage.removeSelectedSubtitle(fileId);
      setSelectedSubtitles(prev => prev.filter(s => s.file_id !== fileId));
    } else {
      // Add to selection
      const selectedSubtitle: SelectedSubtitle = {
        file_id: fileId,
        file_name: file.file_name,
        cd_number: file.cd_number,
        subtitle_info: {
          title: subtitle.attributes.feature_details.title,
          year: subtitle.attributes.feature_details.year,
          language: subtitle.attributes.language,
          release: subtitle.attributes.release,
        },
      };

      LocalStorage.addSelectedSubtitle(selectedSubtitle);
      setSelectedSubtitles(prev => [...prev.filter(s => s.file_id !== fileId), selectedSubtitle]);
    }

    // Emit selection change event
    EventBus.emit(EVENTS.SUBTITLE_SELECTED, {
      fileId,
      selected: !isCurrentlySelected,
      totalSelected: isCurrentlySelected ? selectedSubtitles.length - 1 : selectedSubtitles.length + 1,
    });
  };

  if (subtitles.length === 0 && !currentQuery) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 text-center text-gray-500">
        Search for a movie or TV show to see available subtitles.
      </div>
    );
  }

  if (subtitles.length === 0 && currentQuery) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 text-center text-gray-500">
        No subtitles found for "{currentQuery}". Try a different search term.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">
          Search Results ({subtitles.length})
        </h2>
        {currentQuery && (
          <p className="text-sm text-gray-600">Results for: "{currentQuery}"</p>
        )}
      </div>
      
      <div className="divide-y divide-gray-200">
        {subtitles.map((subtitle) => (
          <div key={subtitle.id} className="p-4 hover:bg-gray-50">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 pt-1 space-y-1">
                {subtitle.attributes.files.map((file) => (
                  <div key={file.file_id} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={isFileSelected(file.file_id)}
                      onChange={() => handleSelectSubtitle(subtitle, file)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </div>
                ))}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-2">
                  <h3 className="text-sm font-medium text-gray-900 truncate">
                    {subtitle.attributes.feature_details.title}
                  </h3>
                  <span className="text-xs text-gray-500">
                    ({subtitle.attributes.feature_details.year})
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                    {subtitle.attributes.language}
                  </span>
                </div>
                
                <div className="text-sm text-gray-600 mb-2">
                  <p className="truncate">{subtitle.attributes.release}</p>
                </div>
                
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  <span>Downloads: {subtitle.attributes.download_count}</span>
                  <span>Rating: {subtitle.attributes.ratings}/10</span>
                  {subtitle.attributes.hearing_impaired && (
                    <span className="text-orange-600">HI</span>
                  )}
                  {subtitle.attributes.hd && (
                    <span className="text-green-600">HD</span>
                  )}
                  {subtitle.attributes.from_trusted && (
                    <span className="text-blue-600">Trusted</span>
                  )}
                </div>
                
                <div className="mt-2 space-y-1">
                  {subtitle.attributes.files.map((file) => (
                    <div key={file.file_id} className="text-xs text-gray-500">
                      File: {file.file_name} (CD {file.cd_number})
                      {isFileSelected(file.file_id) && (
                        <span className="ml-2 text-green-600">✓ Selected</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SubtitleList;