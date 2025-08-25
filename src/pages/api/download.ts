import type { APIRoute } from 'astro';
import { OpenSubtitlesAPI } from '../../utils/opensubtitles';
import type { DownloadRequest, DownloadResponse } from '../../types/download';
import archiver from 'archiver';
import { Readable } from 'stream';



export const POST: APIRoute = async ({ request }) => {
  try {
    const apiKey = import.meta.env.OPENSUBTITLES_API_KEY;
    const appName = import.meta.env.OPENSUBTITLES_APP_NAME;
    const downloadSecurityKey = import.meta.env.DOWNLOAD_SECURITY_KEY;

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

    if (!downloadSecurityKey) {
        return new Response(
          JSON.stringify({ 
            error: 'Security configuration missing' 
          }), 
          { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

    const body: DownloadRequest = await request.json();
    const { fileIds,securityKey } = body;

    if (!securityKey) {
        return new Response(
          JSON.stringify({ 
            error: 'Security key is required' 
          }), 
          { 
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      if (securityKey !== downloadSecurityKey) {
        console.warn('Invalid security key attempt:', { 
          provided: securityKey.substring(0, 3) + '***',
          timestamp: new Date().toISOString(),
          ip: request.headers.get('x-forwarded-for') || 'unknown'
        });
        
        return new Response(
          JSON.stringify({ 
            error: 'Invalid security key' 
          }), 
          { 
            status: 403,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'File IDs array is required' 
        }), 
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Authorized download request for', fileIds.length, 'files');
    
    const api = new OpenSubtitlesAPI(apiKey, appName);
    
    // Create a zip archive
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    // Track download results
    const downloadResults: Array<{
      fileId: number;
      success: boolean;
      fileName?: string;
      error?: string;
    }> = [];

    let quotaInfo: any = null;

    // Download each subtitle file
    for (const fileId of fileIds) {
      try {
        console.log(`Downloading subtitle with file ID: ${fileId}`);
        
        const downloadResponse: DownloadResponse = await api.downloadSubtitle(fileId);
        
        // Store quota info from the first successful download
        if (!quotaInfo) {
          quotaInfo = {
            remaining: downloadResponse.remaining,
            reset_time_utc: downloadResponse.reset_time_utc,
          };
        }

        // Fetch the actual subtitle file content
        const subtitleResponse = await fetch(downloadResponse.link);
        if (!subtitleResponse.ok) {
          throw new Error(`Failed to fetch subtitle content: ${subtitleResponse.status}`);
        }

        const subtitleContent = await subtitleResponse.text();
        
        // Generate a safe filename
        const fileName = downloadResponse.file_name || `subtitle_${fileId}.srt`;
        const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');

        // Add file to archive
        archive.append(subtitleContent, { name: safeFileName });

        downloadResults.push({
          fileId,
          success: true,
          fileName: safeFileName,
        });

        console.log(`Successfully downloaded: ${safeFileName}`);

      } catch (error) {
        console.error(`Failed to download subtitle ${fileId}:`, error);
        
        downloadResults.push({
          fileId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Check if we have any successful downloads
    const successfulDownloads = downloadResults.filter(r => r.success);
    if (successfulDownloads.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'No subtitles could be downloaded',
          details: downloadResults,
        }), 
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Finalize the archive
    archive.finalize();

    // Convert archive stream to buffer
    const chunks: Buffer[] = [];
    archive.on('data', (chunk) => chunks.push(chunk));
    
    await new Promise((resolve, reject) => {
      archive.on('end', resolve);
      archive.on('error', reject);
    });

    const zipBuffer = Buffer.concat(chunks);

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const zipFileName = `subtitles_${timestamp}.zip`;

    // Create response headers
    const headers = new Headers({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${zipFileName}"`,
      'Content-Length': zipBuffer.length.toString(),
      'X-Download-Results': JSON.stringify({
        total: fileIds.length,
        successful: successfulDownloads.length,
        failed: downloadResults.filter(r => !r.success).length,
        quota: quotaInfo,
      }),
    });

    // Return the zip file
    return new Response(zipBuffer, {
      status: 200,
      headers,
    });

  } catch (error) {
    console.error('Download API error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Download failed',
        details: 'An unexpected error occurred during download',
      }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};