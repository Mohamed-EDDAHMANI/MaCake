import { UserStatus } from '../dto/enums/user-status.enum';
import { UserRole } from '../dto/enums/user-role.enum';

export class User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  phone: string | null;
  photo: string | null;
  coverPhoto: string | null;
  city: string | null;
  address: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  description: string | null;
  status: UserStatus;
  createdAt: Date;
  role?: UserRole;
  refreshToken?: string | null;
}
