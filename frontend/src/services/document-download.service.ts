import { apiClient } from '@/utils/api-client';

export const getSecureFileUrl = async (fileId: string): Promise<string> => {
  try {
    const response = await apiClient.get<{
      success: boolean;
      data: { secureUrl: string };
      message?: string;
    }>(`/documents/files/${fileId}/secure-url`);
    if (response.data?.success) {
      return response.data.data.secureUrl;
    } else {
      throw new Error(
        response.data?.message || 'Không thể lấy URL tệp bảo mật',
      );
    }
  } catch (error: unknown) {
    const errorMessage =
      error && typeof error === 'object' && 'response' in error
        ? (error as { response?: { data?: { message?: string } } }).response
            ?.data?.message
        : undefined;
    throw new Error(errorMessage || 'Không thể lấy URL tệp bảo mật.');
  }
};

export const getDownloadUrl = async (
  documentId: string,
): Promise<{
  downloadUrl: string;
  fileName: string;
  fileCount: number;
}> => {
  try {
    const response = await apiClient.post<{
      downloadUrl: string;
      fileName: string;
      fileCount: number;
    }>(`/documents/${documentId}/download-url`);

    if (response?.success && response?.data) {
      return {
        downloadUrl: response.data.downloadUrl,
        fileName: response.data.fileName,
        fileCount: response.data.fileCount,
      };
    } else {
      throw new Error(response.message || 'Không thể lấy URL tải xuống');
    }
  } catch (error: unknown) {
    const errorMessage =
      error && typeof error === 'object' && 'response' in error
        ? (error as { response?: { data?: { message?: string } } }).response
            ?.data?.message
        : undefined;
    throw new Error(errorMessage || 'Không thể lấy URL tải xuống.');
  }
};

export const initDownload = async (
  documentId: string,
): Promise<{ downloadId: string; alreadyDownloaded: boolean }> => {
  try {
    const response = await apiClient.post<{
      downloadId: string;
      alreadyDownloaded: boolean;
    }>(`/documents/${documentId}/init-download`, {
      ipAddress: '',
      userAgent: navigator.userAgent,
      referrer: window.location.href,
    });

    if (response?.success && response?.data) {
      return response.data;
    }

    throw new Error(response.message || 'Không thể khởi tạo tải xuống');
  } catch (error: unknown) {
    const errorMessage =
      error && typeof error === 'object' && 'response' in error
        ? (error as { response?: { data?: { message?: string } } }).response
            ?.data?.message
        : undefined;
    throw new Error(errorMessage || 'Không thể khởi tạo tải xuống.');
  }
};

export const confirmDownload = async (
  downloadId: string,
): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await apiClient.post<{
      success: boolean;
      message: string;
    }>(`/documents/confirm-download/${downloadId}`);

    if (response?.success) {
      return response.data || { success: true, message: 'OK' };
    }

    return { success: false, message: response.message || 'Xác nhận thất bại' };
  } catch (error: unknown) {
    const errorMessage: string =
      error && typeof error === 'object' && 'response' in error
        ? (error as { response?: { data?: { message?: string } } }).response
            ?.data?.message || 'Không thể xác nhận tải xuống'
        : error && typeof error === 'object' && 'message' in error
          ? String((error as { message: unknown }).message)
          : 'Không thể xác nhận tải xuống';
    return { success: false, message: errorMessage };
  }
};

export const cancelDownload = async (
  downloadId: string,
): Promise<{ success: boolean }> => {
  try {
    const response = await apiClient.post<{ success: boolean }>(
      `/documents/cancel-download/${downloadId}`,
    );

    return response.data || { success: true };
  } catch {
    return { success: false };
  }
};

export const trackDownloadCompletion = async (
  documentId: string,
): Promise<void> => {
  try {
    const response = await apiClient.post<{ success: boolean }>(
      `/documents/${documentId}/track-download`,
      {
        ipAddress: '',
        userAgent: navigator.userAgent,
        referrer: window.location.href,
      },
    );

    if (!response?.success) {
      // Failed to track download completion
    }
  } catch {
    // Don't throw error to avoid breaking the download flow
  }
};

export const downloadDocument = async (
  documentId: string,
): Promise<{
  downloadUrl: string;
  fileName: string;
  fileCount: number;
}> => {
  try {
    const response = await apiClient.post<{
      downloadUrl: string;
      fileName: string;
      fileCount: number;
    }>(`/documents/${documentId}/download`, {
      ipAddress: '',
      userAgent: navigator.userAgent,
      referrer: window.location.href,
    });

    if (response?.success && response?.data) {
      return {
        downloadUrl: response.data.downloadUrl,
        fileName: response.data.fileName,
        fileCount: response.data.fileCount,
      };
    } else {
      throw new Error(
        response.message || 'Không thể chuẩn bị tải xuống tài liệu',
      );
    }
  } catch {
    throw new Error('Không thể chuẩn bị tải xuống tài liệu.');
  }
};

export const testDownloadUrl = (url: string): void => {
  window.open(url, '_blank');
};

export const checkDownloadStatus = async (
  documentId: string,
): Promise<{ hasDownloaded: boolean }> => {
  try {
    const response = await apiClient.get<{ hasDownloaded: boolean }>(
      `/points/download-status/${documentId}`,
    );

    const responseAny = response as {
      hasDownloaded?: boolean;
      data?: { hasDownloaded?: boolean };
    };

    if (typeof responseAny?.hasDownloaded === 'boolean') {
      return { hasDownloaded: responseAny.hasDownloaded };
    }

    if (
      responseAny?.data &&
      typeof responseAny.data.hasDownloaded === 'boolean'
    ) {
      return { hasDownloaded: responseAny.data.hasDownloaded };
    }

    return { hasDownloaded: false };
  } catch {
    return { hasDownloaded: false };
  }
};

export const triggerFileDownload = async (
  documentId: string,
  documentTitle?: string,
): Promise<{ confirmed: boolean; message: string }> => {
  let downloadId: string | null = null;

  try {
    const initResult = await initDownload(documentId);
    downloadId = initResult.downloadId;

    const downloadData = await getDownloadUrl(documentId);

    const fileName: string =
      downloadData.fileName || `${documentTitle || 'document'}.zip`;

    try {
      if (
        !downloadData.downloadUrl ||
        !downloadData.downloadUrl.startsWith('http')
      ) {
        throw new Error(
          `URL tải xuống không hợp lệ: ${downloadData.downloadUrl}`,
        );
      }

      const response = await fetch(downloadData.downloadUrl);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP ${response.status}: ${response.statusText}. Response: ${errorText}`,
        );
      }

      const blob = await response.blob();

      if (blob.size === 0) {
        throw new Error('Tệp tải xuống trống');
      }

      const blobUrl = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      link.style.display = 'none';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      window.URL.revokeObjectURL(blobUrl);

      if (downloadId) {
        const confirmResult = await confirmDownload(downloadId);
        return {
          confirmed: confirmResult.success,
          message: confirmResult.success
            ? 'Đã tải xuống tài liệu thành công'
            : confirmResult.message || 'Không thể xác nhận tải xuống',
        };
      }

      return { confirmed: false, message: 'Không có downloadId để xác nhận' };
    } catch {
      try {
        const newWindow = window.open(downloadData.downloadUrl, '_blank');
        if (newWindow) {
          if (downloadId) {
            const confirmResult = await confirmDownload(downloadId);
            return {
              confirmed: confirmResult.success,
              message: confirmResult.success
                ? 'Đã tải xuống tài liệu thành công'
                : confirmResult.message || 'Không thể xác nhận tải xuống',
            };
          }
          return {
            confirmed: false,
            message: 'Không có downloadId để xác nhận',
          };
        }
      } catch {
        // Window.open failed
      }

      const link = document.createElement('a');
      link.href = downloadData.downloadUrl;
      link.download = fileName;
      link.target = '_blank';
      link.style.display = 'none';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      if (downloadId) {
        const confirmResult = await confirmDownload(downloadId);
        return {
          confirmed: confirmResult.success,
          message: confirmResult.success
            ? 'Đã tải xuống tài liệu thành công'
            : confirmResult.message || 'Không thể xác nhận tải xuống',
        };
      }

      return { confirmed: false, message: 'Không có downloadId để xác nhận' };
    }
  } catch (error) {
    if (downloadId) {
      try {
        await cancelDownload(downloadId);
      } catch {
        // Failed to cancel download
      }
    }

    throw error;
  }
};
