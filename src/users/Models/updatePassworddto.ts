import { IsString, IsNotEmpty, IsNumber, IsBoolean, Matches } from 'class-validator';

export class updatePassworddto {
  @IsString()
  @IsNotEmpty()
  new_password: string;

  @IsString()
  @IsNotEmpty()
  old_password: string;

}
