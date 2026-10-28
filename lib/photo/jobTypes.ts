export type PhotoJobStatus = 'queued' | 'processing' | 'completed' | 'failed';
export type PhotoJob = {
  id: string;
  status: PhotoJobStatus;
  createdAt: number;
  expiresAt: number;
  style: string;
  size: string;
  error?: string;
};

export const PHOTO_RESULT_TTL = 7 * 24 * 60 * 60;
export const PHOTO_INPUT_TTL = 24 * 60 * 60;
export const photoJobKey = (owner: string, id: string) => `photo-job:${owner}:${id}`;
export const photoInputKey = (id: string) => `photo-input:${id}`;
export const photoResultKey = (id: string) => `photo-result:${id}`;
