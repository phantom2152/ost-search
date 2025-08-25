export interface OpenSubtitlesFile {
    file_id: number;
    cd_number: number;
    file_name: string;
  }
  
  export interface OpenSubtitlesUploader {
    uploader_id: number;
    name: string;
    rank: string;
  }
  
  export interface OpenSubtitlesFeatureDetails {
    feature_id: number;
    feature_type: string;
    year: number;
    title: string;
    movie_name: string;
    imdb_id: number;
    tmdb_id: number;
  }
  
  export interface OpenSubtitlesRelatedLink {
    label: string;
    url: string;
    img_url: string;
  }
  
  export interface OpenSubtitlesSubtitleAttributes {
    subtitle_id: string;
    language: string;
    download_count: number;
    new_download_count: number;
    hearing_impaired: boolean;
    hd: boolean;
    fps: number;
    votes: number;
    points: number;
    ratings: number;
    from_trusted: boolean;
    foreign_parts_only: boolean;
    ai_translated: boolean;
    machine_translated: boolean;
    upload_date: string;
    release: string;
    comments: string;
    legacy_subtitle_id: number;
    uploader: OpenSubtitlesUploader;
    feature_details: OpenSubtitlesFeatureDetails;
    url: string;
    related_links: OpenSubtitlesRelatedLink[];
    files: OpenSubtitlesFile[];
  }
  
  export interface OpenSubtitlesSubtitle {
    id: string;
    type: string;
    attributes: OpenSubtitlesSubtitleAttributes;
  }
  
  export interface OpenSubtitlesSearchResponse {
    total_pages: number;
    total_count: number;
    per_page: number;
    page: number;
    data: OpenSubtitlesSubtitle[];
  }
  
  export interface OpenSubtitlesUserInfo {
    user_id: number;
    nickname: string;
    vip: boolean;
    uploads_count: number;
    downloads_count: number;
    level: string;
    ext_installed: boolean;
    remaining_downloads: number;
  }
  
  export interface OpenSubtitlesUserResponse {
    data: OpenSubtitlesUserInfo;
  }