/**
 * Format bytes to human readable file size
 */
export function formatFileSize(bytes: number | string): string {
  const bytesNum = typeof bytes === 'string' ? parseInt(bytes, 10) : bytes;

  if (isNaN(bytesNum) || bytesNum === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytesNum) / Math.log(k));

  return `${parseFloat((bytesNum / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Format number with thousand separators
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('vi-VN').format(num);
}
