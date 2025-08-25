import type { APIRoute } from 'astro';
import { OpenSubtitlesAPI } from '../../utils/opensubtitles';
import type { OpenSubtitlesSearchResponse } from '../../types/opensubtitles';

export const GET: APIRoute = async ({ request }) => {
  try {
    const apiKey = import.meta.env.OPENSUBTITLES_API_KEY;
    const appName = import.meta.env.OPENSUBTITLES_APP_NAME;

    if (!apiKey || !appName) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing API configuration' 
        }), 
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const url = new URL(request.url);
    const query = url.searchParams.get('query');
    const languages = url.searchParams.get('languages');
    const imdbId = url.searchParams.get('imdb_id');
    const tmdbId = url.searchParams.get('tmdb_id');
    const page = url.searchParams.get('page');

    if (!query && !imdbId && !tmdbId) {
      return new Response(
        JSON.stringify({ 
          error: 'Query, IMDB ID, or TMDB ID is required' 
        }), 
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const api = new OpenSubtitlesAPI(apiKey, appName);
    
    const searchParams: any = {};
    if (query) searchParams.query = query;
    if (languages) searchParams.languages = languages;
    if (imdbId) searchParams.imdb_id = imdbId;
    if (tmdbId) searchParams.tmdb_id = tmdbId;
    if (page) searchParams.page = parseInt(page);

    const result: OpenSubtitlesSearchResponse = await api.searchSubtitles(searchParams);

    return new Response(
      JSON.stringify(result), 
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Search API error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Search failed' 
      }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};