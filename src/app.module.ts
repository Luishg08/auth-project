import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { UserModule } from './users/user.module';
import { EmailModule } from './users/email/email.module';
@Module({
  imports: [
    // Carga las variables del archivo .env
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // Conexión a MongoDB
    MongooseModule.forRoot(process.env.MONGO_URI),

    // Módulos personalizados
    UserModule,
    EmailModule,
  ],
})
export class AppModule {}
