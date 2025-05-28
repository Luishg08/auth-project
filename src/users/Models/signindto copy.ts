import { IsString, IsNotEmpty, IsNumber, IsBoolean, Matches } from 'class-validator';

export class verifyCodedto {

  @IsString()
  @IsNotEmpty()
  @Matches(/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/)
  email: string;

  @IsString()
  @IsNotEmpty()
  code: string;
  
}
