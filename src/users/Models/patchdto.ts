import { IsString, IsNotEmpty, IsNumber, IsBoolean, Matches } from 'class-validator';

export class patchdto {
  @IsString()
  @IsNotEmpty()
  fullname: string;

}
