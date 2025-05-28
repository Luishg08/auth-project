import {
  IsEmail,
  IsNotEmpty,
  MinLength,
  IsString,
  IsOptional,
  IsMongoId,
  Length,
} from 'class-validator';

// DTO para registrar un nuevo usuario
export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;
}

// DTO para iniciar sesión
export class LoginUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;
}

// DTO para verificar el email con código
export class VerifyEmailDto {
  @IsEmail()
  email: string;

  @IsString()
  @Length(6, 6)
  verificationCode: string;
}

// DTO para actualizar datos del usuario
export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;
}

// DTO para cambiar contraseña
export class ChangePasswordDto {
  @IsNotEmpty()
  @IsString()
  oldPassword: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  newPassword: string;
}

// DTO para refrescar el token
export class RefreshTokenDto {
  @IsNotEmpty()
  @IsString()
  refreshToken: string;
}
