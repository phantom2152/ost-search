export interface SubtitleFile {
    file_id: number;
    cd_number: number;
    file_name: string;
  }
  
  export interface Subtitle {
    id: string;
    attributes: {
      subtitle_id: string;
      language: string;
      download_count: number;
      hearing_impaired: boolean;
      hd: boolean;
      ratings: number;
      from_trusted: boolean;
      upload_date: string;
      release: string;
      feature_details: {
        title: string;
        year: number;
      };
      files: SubtitleFile[];
    };
  }
  
  export interface QuotaInfo {
    remaining_downloads: number;
    last_updated: string;
    recharge_date: string;
  }
  
  export interface Toast {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info';
  } 