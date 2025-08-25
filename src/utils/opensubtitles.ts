const OPENSUBTITLES_BASE_URL = 'https://api.opensubtitles.com/api/v1';

export class OpenSubtitlesAPI {
  private apiKey: string;
  private userAgent: string;

  constructor(apiKey: string, appName: string) {
    this.apiKey = apiKey;
    this.userAgent = `${appName} v1.0.0`;
  }

  private getHeaders(): HeadersInit {
    return {
      'Api-Key': this.apiKey,
      'User-Agent': this.userAgent,
      'Content-Type': 'application/json',
    };
    
  }

  async searchSubtitles(params: {
    query?: string;
    languages?: string;
    imdb_id?: string;
    tmdb_id?: string;
    page?: number;
  }) {
    const searchParams = new URLSearchParams();
    
    if (params.query) searchParams.append('query', params.query);
    if (params.languages) searchParams.append('languages', params.languages);
    if (params.imdb_id) searchParams.append('imdb_id', params.imdb_id);
    if (params.tmdb_id) searchParams.append('tmdb_id', params.tmdb_id);
    if (params.page) searchParams.append('page', params.page.toString());

    const url = `${OPENSUBTITLES_BASE_URL}/subtitles?${searchParams.toString()}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Search failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async downloadSubtitle(fileId: number, subFormat: string = 'srt') {
    const url = `${OPENSUBTITLES_BASE_URL}/download`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        file_id: fileId,
        sub_format: subFormat,
      }),
    });

    if (!response.ok) {
      throw new Error(`Download failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

}