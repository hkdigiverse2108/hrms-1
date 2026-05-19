export const API_URL = '/api';

export function getAvatarUrl(photo: string | undefined, userName?: string) {
  const fallback = `https://api.dicebear.com/7.x/avataaars/svg?seed=${userName ? encodeURIComponent(userName) : 'User'}`;
  if (!photo) return fallback;
  
  if (photo.includes('/uploads/') || (!photo.startsWith('http') && !photo.startsWith('https'))) {
    const filename = photo.split('/').pop();
    return `${API_URL}/uploads/${filename}`;
  }
  
  return photo;
}
