export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  avatar: string;
  color: string;
  isGuest: boolean;
  createdAt: number;
}
