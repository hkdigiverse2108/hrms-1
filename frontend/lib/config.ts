export const API_URL = '/api';

export function getAvatarUrl(photo: string | undefined, userName?: string) {
  if (!photo) return undefined;
  
  if (photo.includes('/uploads/') || (!photo.startsWith('http') && !photo.startsWith('https'))) {
    const filename = photo.split('/').pop();
    return `${API_URL}/uploads/${filename}`;
  }
  
  return photo;
}
