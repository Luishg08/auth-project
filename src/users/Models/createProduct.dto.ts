import { IsString, IsNotEmpty, IsNumber, IsBoolean, Matches } from 'class-validator';

export class signupdto {
  @IsString()
  @IsNotEmpty()
  fullname: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/)
  correo: string;

  @IsString()
  @IsNotEmpty()
  current_password: string;
  
}
