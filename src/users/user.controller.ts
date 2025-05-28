import {
  Controller,
  Post,
  Body,
  Res,
  Req,
  ValidationPipe,
  UsePipes,
  Get,
  UseGuards,
  Delete,
  Patch,
  Put,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';
import { signupdto } from './Models/signupdto';
import { signindto } from './Models/signindto';
import { verifyCodedto } from './Models/verifyCodedto';
import { EmailService } from './email/email.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { patchdto } from './Models/patchdto';
import { updatePassworddto } from './Models/updatePassworddto';
dotenv.config();

const prisma = new PrismaClient()


@Controller('user')
export class UserController {
  constructor(private readonly emailService: EmailService) {}
  @Post('signup')
  async signUp(@Body() body, @Res() res: Response, @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })) dto: signupdto) {
    try {
      const { fullname, email, current_password } = dto;
      const existingUser = await prisma.users.findUnique({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
      }
      const hashedPassword = await bcrypt.hash(current_password, 10);
      const verificationCode = this.emailService.generateVerificationCode();
      const expirationTime = new Date();
      expirationTime.setMinutes(expirationTime.getMinutes() + 5);
      const user = await prisma.users.create({
        data: {
          fullname,
          email,
          current_password: hashedPassword,
          verificationCode,
          verificationCodeExpires: expirationTime,
        },
      });
      const emailSent = await this.emailService.sendVerificationEmail(
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
  async signIn(@Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })) dto: signindto, @Res() res: Response, ) {
    try {
      let { email, current_password } = dto;
      const userExists = await prisma.users.findUnique({ where: { email } });
      if (!userExists) {
        return res.status(404).json({ message: 'User not found' });
      }
      const validatePassword = await bcrypt.compare(
        dto.current_password,
        userExists.current_password,
      );
      if (!validatePassword) {
        return res.status(400).json({ message: "Password doesn't match" });
      }
      if (userExists.isVerified === false
      ) {
        return res.status(400).json({ message: 'User is not active' });
      }
      const token = jwt.sign(
        {
          id: userExists.id,
          email: userExists.email,
          role: userExists.rol,
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '2h' },
      );

      const tokenRefresh = jwt.sign(
        {
          id: userExists.id,
          email: userExists.email,
          role: userExists.rol,
        },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' },
      );

      await prisma.users.update({
        where: { id: userExists.id },
        data: {
          refreshToken: bcrypt.hashSync(tokenRefresh, 10),
        },
      });

      res.status(200).json({
        message: 'User logged in successfully',
        token,
        refreshToken: tokenRefresh,
      });
    } catch (error) {
      res.status(500).json({
        message: 'User was not logged in',
        error: error.message,
      });
    }
  }

  @Post('verify-email')
  async verifyCoded(@Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })) dto: verifyCodedto, @Res() res: Response) {
    const { email, code } = dto;
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
      if (user.isVerified == true) {
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
          isVerified: true,
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
      if (user.isVerified == true) {
        return res.status(400).json({ message: 'User is already verified' });
      }
      const newCode = this.emailService.generateVerificationCode();
      const expirationTime = new Date();
      expirationTime.setMinutes(expirationTime.getMinutes() + 15);
      await prisma.users.update({
        where: { id: user.id },
        data: {
          verificationCode: newCode,
          verificationCodeExpires: expirationTime,
        },
      });
      const emailSent = await this.emailService.sendVerificationEmail(
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


  @Get('refresh-token')
  async refreshToken(@Req() req: Request, @Res() res: Response) {
    try {
      const newToken = jwt.sign(
        {
        
        },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '2h' },
      );
      res.status(200).json({ token: newToken });
    } catch (error) {
      res.status(500).json({
        message: 'Failed to refresh token',
        error: error.message,
      });
    }
  }
  @UseGuards(JwtAuthGuard)
  @Get('getAll')
  async getAllUsers(@Res() res: Response) {
    try {

      const users = await prisma.users.findMany();
      res.status(200).json(users);
    } catch (error) {
      res.status(500).json({
        message: 'Failed to retrieve users',
        error: error.message,
      });
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('getById/:id')
  async getById(@Res() res: Response, @Req() req: Request) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ message: 'User ID is required' });
      }
      const user = await prisma.users.findUnique({ where: { id: id } });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.status(200).json(user);
    } catch (error) {
      res.status(500).json({
        message: 'Failed to retrieve users',
        error: error.message,
      });
    }
  }

  @UseGuards(JwtAuthGuard)
  @Delete('deleteById/:id')
  async deleteById(@Res() res: Response, @Req() req: Request) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ message: 'User ID is required' });
      }
      const user = await prisma.users.findUnique({ where: { id: id } });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      await prisma.users.delete({ where: { id: id } });
      res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
      res.status(500).json({
        message: 'Failed to delete user',
        error: error.message,
      });
    }
  }

  @UseGuards(JwtAuthGuard)
  @Patch('updateById/:id')
  async updateById(@Res() res: Response, @Req() req: Request, @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })) dto: patchdto) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ message: 'User ID is required' });
      }
      const user = await prisma.users.findUnique({ where: { id: id } });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      const updatedUser = await prisma.users.update({
        where: { id: id },
        data: dto,
      });
      res.status(200).json({ message: 'User updated successfully', user: updatedUser });
    } catch (error) {
      res.status(500).json({
        message: 'Failed to update user',
        error: error.message,
      });
    }
  }


  @UseGuards(JwtAuthGuard)
  @Patch('changePassword/:id')
  async changePassword(@Res() res: Response, @Req() req: Request, @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })) dto: updatePassworddto) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ message: 'User ID is required' });
      }
      const user = await prisma.users.findUnique({ where: { id: id } });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      const isPasswordValid = await bcrypt.compare(dto.old_password, user.current_password);
      if (!isPasswordValid) {
        return res.status(400).json({ message: 'Old password is incorrect' });
      }
      if (dto.new_password === dto.old_password) {
        return res.status(400).json({ message: 'New password cannot be the same as old password' });
      }
      const hashedPassword = await bcrypt.hash(dto.new_password, 10);
      const updatedUser = await prisma.users.update({
        where: { id: id },
        data: { current_password: hashedPassword },
      });
      res.status(200).json({ message: 'Password changed successfully', user: updatedUser });
    } catch (error) {
      res.status(500).json({
        message: 'Failed to change password',
        error: error.message,
      });
    }
  }

}