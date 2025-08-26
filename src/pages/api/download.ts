import type { APIRoute } from 'astro';
import { OpenSubtitlesAPI } from '../../utils/opensubtitles';
import type { DownloadRequest, DownloadResponse } from '../../types/download';
import archiver from 'archiver';

interface DownloadResult {
  fileId: number;
  success: boolean;
  fileName?: string;
  content?: string;
  error?: string;
}

interface QuotaInfo {
  remaining: number;
  reset_time_utc: string;
}

// Helper function to create error responses
function createErrorResponse(message: string, status: number, details?: any) {
  return new Response(
    JSON.stringify({ 
      error: message,
      ...(details && { details })
    }), 
    { 
      status,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

// Helper function to validate configuration
function validateConfiguration() {
  const apiKey = import.meta.env.OPENSUBTITLES_API_KEY;
  const appName = import.meta.env.OPENSUBTITLES_APP_NAME;
  const downloadSecurityKey = import.meta.env.DOWNLOAD_SECURITY_KEY;

  if (!apiKey || !appName) {
    throw new Error('Missing API configuration');
  }

  if (!downloadSecurityKey) {
    throw new Error('Security configuration missing');
  }

  return { apiKey, appName, downloadSecurityKey };
}

// Helper function to validate security key
function validateSecurityKey(providedKey: string | undefined, expectedKey: string, request: Request) {
  if (!providedKey) {
    throw new Error('Security key is required');
  }

  if (providedKey !== expectedKey) {
    console.warn('Invalid security key attempt:', { 
      provided: providedKey.substring(0, 3) + '***',
      timestamp: new Date().toISOString(),
      ip: request.headers.get('x-forwarded-for') || 'unknown'
    });
    
    const error = new Error('Invalid security key');
    (error as any).status = 403;
    throw error;
  }
}

// Helper function to validate file IDs
function validateFileIds(fileIds: any) {
  if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
    throw new Error('File IDs array is required');
  }
  return fileIds as number[];
}

// Helper function to download a single subtitle
async function downloadSubtitle(api: OpenSubtitlesAPI, fileId: number): Promise<DownloadResult> {
  try {
    console.log(`Downloading subtitle with file ID: ${fileId}`);
    
    const downloadResponse: DownloadResponse = await api.downloadSubtitle(fileId);
    
    // Fetch the actual subtitle file content
    const subtitleResponse = await fetch(downloadResponse.link);
    if (!subtitleResponse.ok) {
      throw new Error(`Failed to fetch subtitle content: ${subtitleResponse.status}`);
    }

    const subtitleContent = await subtitleResponse.text();
    
    // Generate a safe filename
    const fileName = downloadResponse.file_name || `subtitle_${fileId}.srt`;
    const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');

    console.log(`Successfully downloaded: ${safeFileName}`);

    return {
      fileId,
      success: true,
      fileName: safeFileName,
      content: subtitleContent,
    };

  } catch (error) {
    console.error(`Failed to download subtitle ${fileId}:`, error);
    
    return {
      fileId,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Helper function to create zip archive
async function createZipArchive(results: DownloadResult[]): Promise<Buffer> {
  const archive = archiver('zip', {
    zlib: { level: 9 } // Maximum compression
  });

  // Add successful downloads to archive
  results
    .filter(result => result.success && result.content)
    .forEach(result => {
      archive.append(result.content!, { name: result.fileName! });
    });

  // Finalize the archive
  archive.finalize();

  // Convert archive stream to buffer
  const chunks: Buffer[] = [];
  archive.on('data', (chunk) => chunks.push(chunk));
  
  await new Promise((resolve, reject) => {
    archive.on('end', resolve);
    archive.on('error', reject);
  });

  return Buffer.concat(chunks);
}

// Helper function to generate filename with date and time
function generateZipFileName(): string {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, -5); // Remove milliseconds and Z
  return `subtitles_${timestamp}.zip`;
}

// Helper function to create download results summary
function createDownloadSummary(fileIds: number[], results: DownloadResult[], quotaInfo: QuotaInfo | null) {
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  return {
    total: fileIds.length,
    successful: successful.length,
    failed: failed.length,
    quota: quotaInfo,
  };
}

export const POST: APIRoute = async ({ request }) => {
  try {
    // Validate configuration
    const { apiKey, appName, downloadSecurityKey } = validateConfiguration();

    // Parse and validate request
    const body: DownloadRequest = await request.json();
    const { fileIds, securityKey } = body;

    // Validate security
    validateSecurityKey(securityKey, downloadSecurityKey, request);

    // Validate file IDs
    const validatedFileIds = validateFileIds(fileIds);

    console.log('Authorized download request for', validatedFileIds.length, 'files');
    
    const api = new OpenSubtitlesAPI(apiKey, appName);
    
    // Download all subtitle files
    const downloadResults: DownloadResult[] = [];
    let quotaInfo: QuotaInfo | null = null;

    for (const fileId of validatedFileIds) {
      const result = await downloadSubtitle(api, fileId);
      downloadResults.push(result);

      // Store quota info from the first successful download
      if (!quotaInfo && result.success) {
        try {
          const downloadResponse: DownloadResponse = await api.downloadSubtitle(fileId);
          quotaInfo = {
            remaining: downloadResponse.remaining,
            reset_time_utc: downloadResponse.reset_time_utc,
          };
        } catch (error) {
          // Quota info is optional, continue without it
          console.warn('Could not retrieve quota info:', error);
        }
      }
    }

    // Check if we have any successful downloads
    const successfulDownloads = downloadResults.filter(r => r.success);
    if (successfulDownloads.length === 0) {
      return createErrorResponse(
        'No subtitles could be downloaded',
        500,
        downloadResults
      );
    }

    // Create download summary
    const downloadSummary = createDownloadSummary(validatedFileIds, downloadResults, quotaInfo);

    // Handle single file download
    if (validatedFileIds.length === 1 && successfulDownloads.length === 1) {
      const result = successfulDownloads[0];
      
      return new Response(result.content, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Content-Disposition': `attachment; filename="${result.fileName}"`,
          'X-Download-Results': JSON.stringify(downloadSummary),
        },
      });
    }

    // Handle multiple files - create zip
    const zipBuffer = await createZipArchive(successfulDownloads);
    const zipFileName = generateZipFileName();

    return new Response(zipBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${zipFileName}"`,
        'Content-Length': zipBuffer.length.toString(),
        'X-Download-Results': JSON.stringify(downloadSummary),
      },
    });

  } catch (error) {
    console.error('Download API error:', error);
    
    // Handle errors with custom status codes
    const status = (error as any).status || 500;
    const message = error instanceof Error ? error.message : 'Download failed';
    
    return createErrorResponse(
      message,
      status,
      status === 500 ? 'An unexpected error occurred during download' : undefined
    );
  }
};