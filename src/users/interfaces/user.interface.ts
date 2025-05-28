export interface User {
  id?: string;
  email: string;
  password: string;
  isVerified: boolean;
  verificationCode?: string;
  verificationCodeExpires?: Date;
  refreshTokenHash?: string;
}
