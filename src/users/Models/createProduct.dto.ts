import { IsString, IsNotEmpty, IsNumber, IsBoolean } from 'class-validator';

export class createProductDto {
  @IsString()
  @IsNotEmpty()
  name : string;

  @IsString()
  @IsNotEmpty()
  category : string;

  @IsString()
  @IsNotEmpty()
  description : string;

  @IsNumber()
  @IsNotEmpty()
  price : number;

  @IsString()
  @IsNotEmpty()
  picture : string;

  @IsBoolean()
  @IsNotEmpty()
  fragile : boolean;

  @IsString()
  @IsNotEmpty()
  id : string;
  
}
