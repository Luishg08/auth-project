import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
     generateVerificationCode = () =>
      Math.floor(100000 + Math.random() * 900000).toString();
    
      transporter = nodemailer.createTransport({
       host: 'smtp.gmail.com',
       port: 465,
       secure: true,
       auth: {
         user: process.env.EMAIL_USER,
         pass: process.env.EMAIL_PASS,
       },
     });


     sendVerificationEmail = async (email, code, fullname) => {
      console.log('Sending verification email to:', email, 'with code:', code, fullname);
      try {
        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: email,
          subject: 'Código de verificación para tu cuenta',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e9e9e9; border-radius: 5px;">
              <h2 style="color: #333; text-align: center;">Verificación de cuenta</h2>
              <p>Hola ${fullname},</p>
              <p>Gracias por registrarte. Para completar tu registro, por favor utiliza el siguiente código de verificación:</p>
              <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
                ${code}
              </div>
              <p>Este código expirará en 15 minutos.</p>
              <p>Si no has solicitado este código, por favor ignora este correo.</p>
              <p>Saludos,<br>El equipo de soporte</p>
            </div>
          `,
        };
        const info = await this.transporter.sendMail(mailOptions);
        console.log('Email sent: ' + info.response);
        return true;
      } catch (error) {
        console.error('Error sending email:', error);
        return false;
      }
    };
}
