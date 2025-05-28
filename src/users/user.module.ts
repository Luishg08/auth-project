import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
//import { UsersService } from './user.service';
import { UserController } from './user.controller';
import { User, UserSchema } from './schema/user.schema';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './strategies/jwt.strategy';
import { EmailModule } from '../users/email/email.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    JwtModule.register({ secret: process.env.JWT_SECRET }),
    EmailModule,
  ],
  controllers: [UserController],
  providers: [ JwtStrategy],
})
export class UserModule {}
