import type { QuotaInfo } from '../types/frontend';

export interface SelectedSubtitle {
  file_id: number;
  file_name: string;
  cd_number: number;
  subtitle_info: {
    title: string;
    year: number;
    language: string;
    release: string;
  };
}

export const STORAGE_KEYS = {
  SELECTED_SUBTITLES: 'selectedSubtitles',
  QUOTA_INFO: 'quotaInfo',
} as const;

export class LocalStorage {
  static getSelectedSubtitles(): SelectedSubtitle[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SELECTED_SUBTITLES);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  static setSelectedSubtitles(subtitles: SelectedSubtitle[]): void {
    localStorage.setItem(STORAGE_KEYS.SELECTED_SUBTITLES, JSON.stringify(subtitles));
  }

  static addSelectedSubtitle(subtitle: SelectedSubtitle): void {
    const existing = this.getSelectedSubtitles();
    const updated = existing.filter(s => s.file_id !== subtitle.file_id);
    updated.push(subtitle);
    this.setSelectedSubtitles(updated);
  }

  static removeSelectedSubtitle(fileId: number): void {
    const existing = this.getSelectedSubtitles();
    const updated = existing.filter(s => s.file_id !== fileId);
    this.setSelectedSubtitles(updated);
  }

  static isSubtitleSelected(fileId: number): boolean {
    const existing = this.getSelectedSubtitles();
    return existing.some(s => s.file_id === fileId);
  }

  static getQuotaInfo(): QuotaInfo | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.QUOTA_INFO);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  static setQuotaInfo(quotaInfo: QuotaInfo): void {
    localStorage.setItem(STORAGE_KEYS.QUOTA_INFO, JSON.stringify(quotaInfo));
  }

  static clearSelectedSubtitles(): void {
    localStorage.removeItem(STORAGE_KEYS.SELECTED_SUBTITLES);
  }
}