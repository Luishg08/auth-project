import {
  Controller,
  Post,
  Body,
  Res,
  Req,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import * as nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const generateVerificationCode = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

const sendVerificationEmail = async (email, code, fullname) => {
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
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent: ' + info.response);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};

@Controller('user')
export class UserController {
  @Post('signup')
  async signUp(@Body() body, @Res() res: Response) {
    let { fullname, email, current_password, phone } = body;
    if (email) email = email.toLowerCase().trim();
    if (!fullname || !email || !current_password || !phone) {
      return res.status(400).json({
        message: 'fullname, email, current_password are required',
      });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }
    if (current_password.length < 6) {
      return res.status(400).json({
        message: 'Password must be at least 6 characters',
      });
    }
    try {
      const existingUser = await prisma.users.findUnique({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
      }
      const hashedPassword = await bcrypt.hash(current_password, 10);
      const verificationCode = generateVerificationCode();
      const expirationTime = new Date();
      expirationTime.setMinutes(expirationTime.getMinutes() + 15);
      const user = await prisma.users.create({
        data: {
          fullname,
          email,
          current_password: hashedPassword,
          status: 'PENDING',
          phone,
          verificationCode,
          verificationCodeExpires: expirationTime,
        },
      });
      const emailSent = await sendVerificationEmail(
        email,
        verificationCode,
        fullname,
      );
      if (!emailSent) {
        await prisma.users.delete({ where: { id: user.id } });
        return res.status(500).json({
          message: 'Failed to send verification email. Please try again later.',
        });
      }
      res.status(201).json({
        message:
          'User created successfully. Please check your email out for the verification code.',
        user,
      });
    } catch (error) {
      return res.status(500).json({
        message: 'User was not created',
        error: error,
      });
    }
  }

  @Post('signin')
  async signIn(@Body() body, @Res() res: Response) {
    let { email, current_password } = body;
    if (email) email = email.toLowerCase().trim();
    if (!email || !current_password) {
      return res.status(400).json({
        message: 'All required fields: email and password',
      });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email address' });
    }
    try {
      const userExists = await prisma.users.findUnique({ where: { email } });
      if (!userExists) {
        return res.status(404).json({ message: 'User not found' });
      }
      const validatePassword = await bcrypt.compare(
        current_password,
        userExists.current_password,
      );
      if (!validatePassword) {
        return res.status(400).json({ message: "Password doesn't match" });
      }
      if (userExists.status !== 'ACTIVE') {
        return res.status(400).json({ message: 'User is not active' });
      }
      const verificationCode = generateVerificationCode();
      const expirationTime = new Date();
      expirationTime.setMinutes(expirationTime.getMinutes() + 15);
      await prisma.users.update({
        where: { id: userExists.id },
        data: {
          verificationCodePhone: verificationCode,
          verificationCodePhoneExpires: expirationTime,
        },
      });
      const token = jwt.sign(
        {
          id: userExists.id,
          email: userExists.email,
          role: userExists.rol,
        },
        process.env.JWT_SECRET,
        { expiresIn: '2h' },
      );
      res.status(200).json({
        message: 'User logged in successfully',
        token,
      });
    } catch (error) {
      res.status(500).json({
        message: 'User was not logged in',
        error: error.message,
      });
    }
  }

  @Post('verify-email')
  async verifyCode(@Body() body, @Res() res: Response) {
    const { email, code } = body;
    if (!email || !code) {
      return res.status(400).json({
        message: 'Email and verification code are required',
      });
    }
    try {
      const user = await prisma.users.findUnique({ where: { email } });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      if (user.status === 'ACTIVE') {
        return res.status(400).json({ message: 'User is already verified' });
      }
      const now = new Date();
      if (now > user.verificationCodeExpires) {
        return res.status(400).json({
          message: 'Verification code has expired. Please request a new one.',
        });
      }
      if (user.verificationCode !== code) {
        return res.status(400).json({ message: 'Invalid verification code' });
      }
      await prisma.users.update({
        where: { id: user.id },
        data: {
          status: 'ACTIVE',
          verificationCode: null,
          verificationCodeExpires: null,
        },
      });
      res.status(200).json({ message: 'Account verified succsessfully' });
    } catch (error) {
      res.status(500).json({
        message: 'Verification failed',
        error: error.message,
      });
    }
  }

  @Post('resend-email-code')
  async resendVerificationCode(@Body() body, @Res() res: Response) {
    const { email } = body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    try {
      const user = await prisma.users.findUnique({ where: { email } });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      if (user.status === 'ACTIVE') {
        return res.status(400).json({ message: 'User is already verified' });
      }
      const newCode = generateVerificationCode();
      const expirationTime = new Date();
      expirationTime.setMinutes(expirationTime.getMinutes() + 15);
      await prisma.users.update({
        where: { id: user.id },
        data: {
          verificationCode: newCode,
          verificationCodeExpires: expirationTime,
        },
      });
      const emailSent = await sendVerificationEmail(
        email,
        newCode,
        user.fullname,
      );
      if (!emailSent) {
        return res.status(500).json({
          message: 'Failed to send verification email. Please try again later.',
        });
      }
      res.status(200).json({
        message: 'Verification code sent successfully. Please check your email.',
      });
    } catch (error) {
      res.status(500).json({
        message: 'Failed to resend verification code',
        error: error.message,
      });
    }
  }

  @Post('2fa')
  async twoFactorAuthentication(@Body() body, @Res() res: Response) {
    let { email, phoneCode } = body;
    if (email) email = email.toLowerCase().trim();
    if (!email || !phoneCode) {
      return res.status(400).json({
        message: 'All required fields: email and phoneCode',
      });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email address' });
    }
    try {
      const userExists = await prisma.users.findUnique({ where: { email } });
      if (!userExists) {
        return res.status(404).json({ message: 'User not found' });
      }
      if (userExists.status !== 'ACTIVE') {
        return res.status(400).json({ message: 'User is not active' });
      }
      if (userExists.verificationCodePhone !== phoneCode) {
        return res.status(400).json({ message: 'Invalid verification code' });
      }
      if (userExists.verificationCodePhoneExpires < new Date()) {
        return res.status(400).json({ message: 'Verification code has expired' });
      }
      await prisma.users.update({
        where: { id: userExists.id },
        data: {
          verificationCodePhone: null,
          verificationCodePhoneExpires: null,
        },
      });
      const token = jwt.sign(
        {
          id: userExists.id,
          email: userExists.email,
          role: userExists.rol,
        },
        process.env.JWT_SECRET,
        { expiresIn: '2h' },
      );
      res.status(200).json({
        message: 'Two factor authentication successfull',
        token,
      });
    } catch (error) {
      res.status(500).json({
        message: 'Internal server error',
        error: error.message,
      });
    }
  }

}