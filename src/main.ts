import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'; //Importamos dependencias para swagger
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3000);
  app.enableCors({
    origin: '*', 
    credentials: true,
  });
  // const config = new DocumentBuilder()
  //   .setTitle('AuthProject')
  //   .setDescription('Documentación de la API')
  //   .setVersion('1.0')
  //   .build();
  // const document = SwaggerModule.createDocument(app, config);
  // SwaggerModule.setup('api/docs', app, document);
  // const PORT = process.env.PORT || 3000;
  // await app.listen(PORT);
  // app.useGlobalPipes(
  //   new ValidationPipe({
  //     whitelist: true,
  //     forbidNonWhitelisted: true,
  //     transform: true,
  //   }),
  // );
}
bootstrap();
