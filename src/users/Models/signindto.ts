import { IsString, IsNotEmpty, IsNumber, IsBoolean, Matches } from 'class-validator';

export class signindto {

  @IsString()
  @IsNotEmpty()
  @Matches(/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/)
  email: string;

  @IsString()
  @IsNotEmpty()
  current_password: string;
  
}
