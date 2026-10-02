import {
  WatchVirtualTryOnProvider,
  VirtualTryOnProvider,
  VirtualTryOnInput,
  VirtualTryOnProviderResult
} from '../types';

export interface PerfectCorpWatchInput {
  userImageUrl: string;
  productImageUrl: string;
}

export interface PerfectCorpWatchOutput {
  resultImageUrl: string;
  resultId?: string;
  processingTimeMs?: number;
}

export interface ResolvedImageInput {
  isUrl: boolean;
  value: string;
}

export class PerfectCorpWatchProvider implements WatchVirtualTryOnProvider, VirtualTryOnProvider {
  public name = 'Perfect Corp AI Watch Virtual Try-On';
  
  // Official Perfect Corp 2D Watch VTO & File Endpoints (https://docs.makeupar.com/reference/ai_watch/v1.0)
  private taskEndpoint = 'https://yce-api-01.makeupar.com/s2s/v2.0/task/2d-vto/watch';
  private fileUploadEndpoint = 'https://yce-api-01.makeupar.com/s2s/v2.0/file';

  /**
   * Main entry point implementing WatchVirtualTryOnProvider interface
   */
  async generateTryOn(params: {
    userImageUrl: string;
    productImageUrl: string;
  }): Promise<{ resultImageUrl: string; resultId?: string }>;

  /**
   * Overload implementing VirtualTryOnProvider interface
   */
  async generateTryOn(input: VirtualTryOnInput): Promise<VirtualTryOnProviderResult>;

  async generateTryOn(
    inputOrParams: { userImageUrl: string; productImageUrl: string } | VirtualTryOnInput
  ): Promise<any> {
    const startTime = Date.now();

    // 1. Normalize Input Parameters
    let userImageUrl: string;
    let productImageUrl: string;
    let isStandardProviderInput = false;

    if ('userImageUrl' in inputOrParams && 'productImageUrl' in inputOrParams) {
      userImageUrl = inputOrParams.userImageUrl;
      productImageUrl = inputOrParams.productImageUrl;
    } else if ('userImage' in inputOrParams && 'productImage' in inputOrParams) {
      isStandardProviderInput = true;
      userImageUrl = typeof inputOrParams.userImage === 'string'
        ? inputOrParams.userImage
        : `data:image/jpeg;base64,${inputOrParams.userImage.toString('base64')}`;
      productImageUrl = typeof inputOrParams.productImage === 'string'
        ? inputOrParams.productImage
        : `data:image/jpeg;base64,${inputOrParams.productImage.toString('base64')}`;
    } else {
      throw new Error('Invalid input parameters supplied to PerfectCorpWatchProvider.');
    }

    // 2. Validate Environmental API Key
    const apiKey = (process.env.PERFECT_CORP_API_KEY || '').trim();
    if (!apiKey) {
      console.error('[PerfectCorpWatchProvider] Error: PERFECT_CORP_API_KEY environment variable is missing.');
      throw new Error('PERFECT_CORP_API_KEY is missing from server environment. Please configure PERFECT_CORP_API_KEY in .env.');
    }

    // 3. Input Validation
    if (!userImageUrl || typeof userImageUrl !== 'string') {
      throw new Error('User photograph is required for Perfect Corp Watch Virtual Try-On.');
    }
    if (!productImageUrl || typeof productImageUrl !== 'string') {
      throw new Error('Product watch photograph is required for Perfect Corp Watch Virtual Try-On.');
    }

    const userSourceType = this.isPublicHttpUrl(userImageUrl) ? 'url' : userImageUrl.startsWith('data:') ? 'base64' : 'local/blob';
    const productSourceType = this.isPublicHttpUrl(productImageUrl) ? 'url' : productImageUrl.startsWith('data:') ? 'base64' : 'local/blob';

    console.log(
      `[PerfectCorpWatchProvider] Initiating 2D Watch VTO Task. TaskEndpoint: ${this.taskEndpoint}, UserPhotoSource: ${userSourceType}, ProductPhotoSource: ${productSourceType}`
    );

    // 4. Resolve Image Inputs (Public URL or Two-Step Presigned S2S File API Upload)
    const srcInput = await this.resolveImageInput(userImageUrl, apiKey, 'User Image');
    const refInput = await this.resolveImageInput(productImageUrl, apiKey, 'Watch Product Image');

    // 5. Create Watch VTO Task (V1.0 Payload Schema)
    const { taskId, pollingInterval } = await this.createWatchVtoTask(srcInput, refInput, apiKey, startTime);

    // 6. Poll Watch VTO Task Status Until Completion
    const pollBaseUrl = `${this.taskEndpoint}/${taskId}`;
    const resultImageUrl = await this.pollWatchVtoTask(pollBaseUrl, apiKey, pollingInterval, startTime);
    const duration = Date.now() - startTime;

    console.log(`[PerfectCorpWatchProvider] SUCCESS: Watch Try-On Complete! Duration: ${duration}ms, TaskId: ${taskId}`);

    if (isStandardProviderInput) {
      return {
        imageUrl: resultImageUrl,
        processingTimeMs: duration,
        providerName: this.name,
        requestId: taskId,
        provider: 'perfect_corp'
      } as VirtualTryOnProviderResult;
    }

    return {
      resultImageUrl,
      resultId: taskId
    };
  }

  /**
   * Helper to check if an image URL is a public HTTP(S) URL
   */
  private isPublicHttpUrl(url: string): boolean {
    if (!url || typeof url !== 'string') return false;
    const trimmed = url.trim().toLowerCase();
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) return false;
    if (trimmed.includes('localhost') || trimmed.includes('127.0.0.1') || trimmed.includes('0.0.0.0')) return false;
    return true;
  }

  /**
   * Resolves image input to either public URL or uploaded S2S File ID
   */
  private async resolveImageInput(
    imageUrl: string,
    apiKey: string,
    fileLabel: string
  ): Promise<ResolvedImageInput> {
    if (this.isPublicHttpUrl(imageUrl)) {
      return { isUrl: true, value: imageUrl.trim() };
    }

    console.log(`[PerfectCorpWatchProvider] ${fileLabel} is base64/non-public. Executing Two-Step S2S File API upload...`);
    const fileId = await this.uploadImageToPerfectCorp(imageUrl, apiKey, fileLabel);
    return { isUrl: false, value: fileId };
  }

  /**
   * Parses base64 data URI or raw string into Node.js Buffer, mimeType, and fileSize
   */
  private parseBase64Image(input: string, defaultLabel: string): {
    buffer: Buffer;
    mimeType: string;
    fileSize: number;
    fileName: string;
  } {
    let base64Data = input;
    let mimeType = 'image/jpeg';

    if (input.startsWith('data:')) {
      const matches = input.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        mimeType = matches[1];
        base64Data = matches[2];
      }
    }

    const buffer = Buffer.from(base64Data, 'base64');
    const ext = mimeType.split('/')[1] || 'jpg';
    const sanitizedLabel = defaultLabel.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const fileName = `${sanitizedLabel}-${Date.now()}.${ext}`;

    return {
      buffer,
      mimeType,
      fileSize: buffer.length,
      fileName
    };
  }

  /**
   * Two-Step S2S File Upload Workflow:
   * STEP 1: POST JSON metadata to receive file_id and presigned upload URL
   * STEP 2: PUT raw binary image Buffer to presigned upload URL
   */
  private async uploadImageToPerfectCorp(
    imageDataUriOrBase64: string,
    apiKey: string,
    fileLabel: string
  ): Promise<string> {
    const { buffer, mimeType, fileSize, fileName } = this.parseBase64Image(imageDataUriOrBase64, fileLabel);

    // STEP 1: POST metadata JSON request to https://yce-api-01.makeupar.com/s2s/v2.0/file
    const step1Payload = {
      files: [
        {
          file_name: fileName,
          file_size: fileSize,
          content_type: mimeType
        }
      ]
    };

    console.log(
      `[PerfectCorpWatchProvider] [Step 1 File API Metadata] Endpoint: ${this.fileUploadEndpoint}, file_name: ${fileName}, content_type: ${mimeType}, file_size: ${fileSize} bytes`
    );

    let fileId: string | null = null;
    let uploadUrl: string | null = null;
    let uploadHeaders: Record<string, string> = {};
    let uploadMethod = 'PUT';

    try {
      const response = await fetch(this.fileUploadEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(step1Payload)
      });

      const responseText = await response.text();
      let data: any = {};
      try {
        data = JSON.parse(responseText);
      } catch {
        data = { rawText: responseText };
      }

      if (!response.ok || data.status === 'failed' || data.error) {
        console.error(`[PerfectCorpWatchProvider] S2S File API Step 1 Failed (HTTP ${response.status}):`, JSON.stringify(data));
        const errDesc = data.error?.message || data.message || `HTTP ${response.status} ${response.statusText}`;
        throw new Error(`Perfect Corp File API Metadata request failed: ${errDesc}`);
      }

      // Parse file_id and presigned upload request
      const fileData = data.data?.files?.[0] || data.files?.[0] || data;
      fileId = fileData.file_id || data.data?.file_id || data.file_id;
      const requestItem = fileData.requests?.[0] || fileData.request;

      if (requestItem) {
        uploadUrl = requestItem.url;
        uploadMethod = requestItem.method || 'PUT';
        if (requestItem.headers && typeof requestItem.headers === 'object') {
          uploadHeaders = requestItem.headers;
        }
      }

      if (!fileId || !uploadUrl) {
        console.error('[PerfectCorpWatchProvider] S2S File API Step 1 response missing file_id or upload URL:', JSON.stringify(data));
        throw new Error('Perfect Corp File API Step 1 returned invalid response structure (missing file_id or presigned URL).');
      }

      console.log(`[PerfectCorpWatchProvider] [Step 1 File API Success] FileId: ${fileId}, Presigned Method: ${uploadMethod}`);
    } catch (err: any) {
      console.error(`[PerfectCorpWatchProvider] Error during S2S File API Step 1 for ${fileLabel}:`, err?.message || err);
      throw err;
    }

    // STEP 2: PUT Raw Binary Image Bytes to Presigned Upload URL
    console.log(`[PerfectCorpWatchProvider] [Step 2 Binary Upload] Executing ${uploadMethod} binary byte upload (${buffer.length} bytes)...`);

    try {
      const uploadResponse = await fetch(uploadUrl, {
        method: uploadMethod,
        headers: uploadHeaders,
        body: new Uint8Array(buffer)
      });

      if (!uploadResponse.ok) {
        const uploadErrText = await uploadResponse.text();
        console.error(`[PerfectCorpWatchProvider] [Step 2 Binary Upload Failed] HTTP ${uploadResponse.status}:`, uploadErrText.slice(0, 300));
        throw new Error(`Presigned binary upload failed (HTTP ${uploadResponse.status} ${uploadResponse.statusText}).`);
      }

      console.log(`[PerfectCorpWatchProvider] [Step 2 Binary Upload Success] Successfully uploaded binary image bytes for FileId: ${fileId}`);
      return fileId;
    } catch (err: any) {
      console.error(`[PerfectCorpWatchProvider] Error during S2S File API Step 2 for ${fileLabel}:`, err?.message || err);
      throw err;
    }
  }

  /**
   * Submits 2D Watch VTO Task Creation request (POST /s2s/v2.0/task/2d-vto/watch)
   * Using official Watch V1.0 schema (source_info, object_infos)
   */
  private async createWatchVtoTask(
    srcInput: ResolvedImageInput,
    refInput: ResolvedImageInput,
    apiKey: string,
    startTime: number
  ): Promise<{ taskId: string; pollingInterval: number }> {
    const requestPayload: any = {};

    if (srcInput.isUrl) {
      requestPayload.src_file_url = srcInput.value;
    } else {
      requestPayload.src_file_id = srcInput.value;
    }

    if (refInput.isUrl) {
      requestPayload.ref_file_urls = [refInput.value];
    } else {
      requestPayload.ref_file_ids = [refInput.value];
    }

    // Watch V1.0 Required Schema Elements (Omit optional watch_anchor_point & watch_wearing_location for automatic AI detection)
    requestPayload.source_info = {
      name: srcInput.value
    };

    requestPayload.object_infos = [
      {
        name: refInput.value,
        parameter: {
          watch_need_remove_background: true,
          watch_shadow_intensity: 0.3,
          watch_ambient_light_intensity: 1
        }
      }
    ];

    // Safe Diagnostic Logging (No credentials, base64 data, or raw bytes exposed)
    console.log('[PerfectCorpWatchProvider] Watch VTO V1.0 Task Payload:', JSON.stringify({
      src_file_id: srcInput.isUrl ? undefined : '[present_file_id]',
      ref_file_ids: refInput.isUrl ? undefined : ['[present_file_id]'],
      src_file_url: srcInput.isUrl ? srcInput.value : undefined,
      ref_file_urls: refInput.isUrl ? [refInput.value] : undefined,
      source_info: { name: srcInput.isUrl ? srcInput.value : '[present_file_id]' },
      object_infos: [
        {
          name: refInput.isUrl ? refInput.value : '[present_file_id]',
          parameter: {
            watch_need_remove_background: true,
            watch_shadow_intensity: 0.3,
            watch_ambient_light_intensity: 1
          }
        }
      ]
    }));

    const timeoutMs = parseInt(process.env.PERFECT_CORP_TIMEOUT_MS || '30000', 10);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(this.taskEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestPayload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const responseText = await response.text();
      let responseData: any = {};
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = { rawText: responseText };
      }

      if (!response.ok || responseData.error || responseData.status === 'failed' || responseData.task_status === 'error') {
        console.error(
          `[PerfectCorpWatchProvider] Task Creation Error Response (HTTP ${response.status}):`,
          JSON.stringify({
            status: responseData.status || response.status,
            error: responseData.error,
            error_code: responseData.error_code || responseData.code || responseData.error?.code,
            message: responseData.message || responseData.error?.message,
            detail: responseData.detail || responseData.details,
            fullResponseBody: responseData
          })
        );
        const errorMsg = this.formatPerfectCorpError(responseData, response.status);
        throw new Error(errorMsg);
      }

      const taskId = responseData.task_id || responseData.data?.task_id || responseData.id;
      let pollingInterval = 2000;
      if (responseData.polling_interval && typeof responseData.polling_interval === 'number') {
        pollingInterval = responseData.polling_interval;
      } else if (responseData.data?.polling_interval) {
        pollingInterval = responseData.data.polling_interval;
      }

      if (!taskId) {
        console.error('[PerfectCorpWatchProvider] Task creation response missing task_id:', JSON.stringify(responseData).slice(0, 200));
        throw new Error('Perfect Corp Watch VTO task creation failed to return a valid task_id.');
      }

      console.log(`[PerfectCorpWatchProvider] Task Created Successfully. TaskId: ${taskId}, PollingInterval: ${pollingInterval}ms`);
      return { taskId, pollingInterval };
    } catch (err: any) {
      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;
      if (err.name === 'AbortError' || err.code === 'UND_ERR_CONNECT_TIMEOUT' || err.message?.includes('fetch failed')) {
        console.error(`[PerfectCorpWatchProvider] Connection timeout creating task after ${duration}ms at ${this.taskEndpoint}`);
        throw new Error(`Perfect Corp API connection timed out connecting to ${this.taskEndpoint}. Please check network access or set VIRTUAL_TRY_ON_PROVIDER=mock in .env for offline testing.`);
      }
      throw err;
    }
  }

  /**
   * Polls task result until task_status === 'success' or terminal error
   */
  private async pollWatchVtoTask(
    pollUrl: string,
    apiKey: string,
    intervalMs: number,
    startTime: number
  ): Promise<string> {
    const maxAttempts = 30; // Max 60 seconds total execution time
    const waitTime = Math.max(2000, intervalMs);

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, waitTime));

      try {
        const response = await fetch(pollUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Accept': 'application/json'
          }
        });

        const responseText = await response.text();
        let data: any = {};
        try {
          data = JSON.parse(responseText);
        } catch {
          data = { rawText: responseText };
        }

        // 1. HTTP-Level Failure Check (4xx / 5xx)
        if (!response.ok) {
          console.error(`[PerfectCorpWatchProvider] Task Polling HTTP Failure (HTTP ${response.status}):`, JSON.stringify(data));
          const httpErrorMsg = this.formatPerfectCorpError(data, response.status);
          const err = new Error(httpErrorMsg);
          (err as any).isTerminal = true;
          throw err;
        }

        // 2. Parse Task Status & Sanitized Payload
        const statusObj = data.data || data;
        const taskStatus = (statusObj.task_status || statusObj.status || data.task_status || data.status || '').toLowerCase();

        console.log(`[PerfectCorpWatchProvider] Poll Response (Attempt ${attempt}/${maxAttempts}):`, JSON.stringify({
          httpStatus: response.status,
          task_status: taskStatus || statusObj.task_status,
          error: statusObj.error || data.error,
          error_code: statusObj.error_code || data.error_code || statusObj.code || data.code,
          results: statusObj.results || data.results ? '[present]' : null,
          fullResponse: data
        }));

        // 3. Check for Successful Completion
        if (taskStatus === 'success' || (response.ok && this.extractResultUrl(data))) {
          const resultUrl = this.extractResultUrl(data);
          if (resultUrl) {
            return resultUrl;
          }
        }

        // 4. Check for Task Engine Failure
        if (taskStatus === 'error' || taskStatus === 'failed' || statusObj.error || statusObj.error_code || data.error || data.error_code) {
          const taskErrorCode = statusObj.error_code || data.error_code || statusObj.code || data.code || statusObj.error?.code || data.error?.code || statusObj.error;
          const rawTaskError = statusObj.error_message || data.error_message || statusObj.error || data.error || statusObj.message || data.message;
          const taskErrorMsg = typeof rawTaskError === 'string'
            ? rawTaskError
            : rawTaskError?.message || rawTaskError?.error || (typeof data?.error === 'string' ? data.error : '');

          const formattedError = this.formatPerfectCorpError(data, response.status);

          console.error(`[PerfectCorpWatchProvider] Task Polling Engine Failure (Attempt ${attempt}):`, JSON.stringify({
            taskStatus,
            taskErrorMsg,
            taskErrorCode,
            formattedError,
            fullData: data
          }));

          const err = new Error(formattedError);
          (err as any).isTerminal = true;
          throw err;
        }
      } catch (pollErr: any) {
        if (pollErr.isTerminal || pollErr.message?.includes('Perfect Corp') || pollErr.message?.includes('Could not') || pollErr.message?.includes('failed') || pollErr.message?.includes('photograph')) {
          throw pollErr;
        }
        console.warn(`[PerfectCorpWatchProvider] Task polling transient error (Attempt ${attempt}):`, pollErr?.message || pollErr);
      }
    }

    const elapsed = Date.now() - startTime;
    throw new Error(`Perfect Corp Watch VTO task polling timed out after ${elapsed}ms (${maxAttempts} attempts).`);
  }

  /**
   * Extracts result image URL from task response
   */
  private extractResultUrl(data: any): string | null {
    if (!data) return null;
    const obj = data.data || data.result || data;

    if (obj.results?.url && typeof obj.results.url === 'string') return obj.results.url;
    if (Array.isArray(obj.results) && obj.results[0]?.url) return obj.results[0].url;
    if (obj.result_url && typeof obj.result_url === 'string') return obj.result_url;
    if (obj.result_file_url && typeof obj.result_file_url === 'string') return obj.result_file_url;
    if (obj.result_image_url && typeof obj.result_image_url === 'string') return obj.result_image_url;
    if (obj.image_url && typeof obj.image_url === 'string') return obj.image_url;
    if (obj.output_image_url && typeof obj.output_image_url === 'string') return obj.output_image_url;
    if (obj.url && typeof obj.url === 'string') return obj.url;
    if (Array.isArray(obj.urls) && obj.urls[0]) return obj.urls[0];
    if (Array.isArray(obj.images) && obj.images[0]) {
      return typeof obj.images[0] === 'string' ? obj.images[0] : obj.images[0].url || null;
    }
    return null;
  }

  /**
   * Formats Perfect Corp documented error codes into application-friendly messages
   */
  private formatPerfectCorpError(data: any, httpStatus: number): string {
    const statusObj = data?.data || data || {};
    const errorObj = statusObj?.error || data?.error || statusObj;

    const errorCode = String(
      statusObj.error_code ||
      statusObj.code ||
      data.error_code ||
      data.code ||
      (typeof statusObj.error === 'string' || typeof statusObj.error === 'number' ? statusObj.error : '') ||
      (typeof data.error === 'string' || typeof data.error === 'number' ? data.error : '') ||
      ''
    );

    const rawMsg =
      statusObj.error_message ||
      data.error_message ||
      errorObj.error_message ||
      errorObj.message ||
      statusObj.message ||
      data.message ||
      statusObj.detail ||
      data.detail ||
      (typeof errorObj === 'string' ? errorObj : '') ||
      '';

    if (httpStatus === 401 || httpStatus === 403 || String(rawMsg).toLowerCase().includes('unauthorized') || String(rawMsg).toLowerCase().includes('api key')) {
      return 'Perfect Corp API authentication failed (HTTP 401/403). Please verify your PERFECT_CORP_API_KEY in .env.';
    }
    if (httpStatus === 429 || String(rawMsg).toLowerCase().includes('rate limit') || String(rawMsg).toLowerCase().includes('quota')) {
      return 'Perfect Corp API rate limit or credit quota exceeded. Please try again later.';
    }

    const upperMsg = String(rawMsg).toUpperCase();
    const upperCode = String(errorCode).toUpperCase();

    if (upperMsg.includes('NO HAND DETECTED') || upperMsg.includes('NO WRIST DETECTED') || upperCode === 'PHOTO_DETECTION_FAIL' || upperCode === '2') {
      return 'Could not detect a hand or wrist in your photograph. Please upload a clear photo showing your wrist.';
    }
    if (upperMsg.includes('WRIST SHOULD BE IN THE CORRECT POSE') || upperMsg.includes('CORRECT POSE') || upperCode === '4') {
      return 'The wrist in your photograph is angled or partially cut off. Please position your arm flat with the top of your wrist centered and facing directly towards the camera.';
    }
    if (upperMsg.includes('OBJECT_DETECTION') || upperCode === 'OBJECT_DETECTION_FAIL') {
      return 'Could not detect or isolate the watch face from the product image.';
    }
    if (upperCode === 'PHOTO_CHECK_INVALID') {
      return 'The uploaded photograph format or resolution is invalid (must be JPG/PNG under 10MB).';
    }

    if (rawMsg && errorCode) {
      return `Perfect Corp Watch VTO task failed: ${rawMsg} (Code: ${errorCode})`;
    }
    if (rawMsg) {
      return `Perfect Corp Watch VTO task failed: ${rawMsg}`;
    }
    if (errorCode) {
      return `Perfect Corp Watch VTO task failed with code ${errorCode}`;
    }

    return `Perfect Corp Watch VTO request failed with HTTP ${httpStatus}`;
  }
}
