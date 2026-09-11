import { prisma } from '../../config/prisma.js';
import { hashPassword, verifyPassword } from '../../utils/password.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  type JwtUserPayload,
} from '../../utils/jwt.js';
import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from '../../utils/errors.js';
import type { RegisterInput, LoginInput } from './auth.validation.js';

const getRefreshTokenExpiryDate = (): Date => {
  const date = new Date();
  date.setDate(date.getDate() + 7); // 7 days from now
  return date;
};

export class AuthService {
  async register(input: RegisterInput) {
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictError('A user with this email already exists');
    }

    const hashedPassword = await hashPassword(input.password);

    const user = await prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        password: hashedPassword,
        name: input.name || null,
        role: input.role,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const tokenPayload: JwtUserPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: getRefreshTokenExpiryDate(),
      },
    });

    return {
      user,
      accessToken,
      refreshToken,
    };
  }

  async login(input: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isPasswordValid = await verifyPassword(user.password, input.password);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const tokenPayload: JwtUserPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: getRefreshTokenExpiryDate(),
      },
    });

    const sanitizedUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    return {
      user: sanitizedUser,
      accessToken,
      refreshToken,
    };
  }

  async refreshTokens(oldRefreshToken: string) {
    if (!oldRefreshToken) {
      throw new UnauthorizedError('Refresh token missing');
    }

    let payload: JwtUserPayload;
    try {
      payload = verifyRefreshToken(oldRefreshToken);
    } catch {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    const tokenRecord = await prisma.refreshToken.findUnique({
      where: { token: oldRefreshToken },
      include: { user: true },
    });

    if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
      // If token not found or expired, delete any existing records for safety
      if (tokenRecord) {
        await prisma.refreshToken.delete({ where: { id: tokenRecord.id } });
      }
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    const user = tokenRecord.user;

    const tokenPayload: JwtUserPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    };

    const newAccessToken = generateAccessToken(tokenPayload);
    const newRefreshToken = generateRefreshToken(tokenPayload);

    // Rotate refresh token
    await prisma.$transaction([
      prisma.refreshToken.delete({ where: { id: tokenRecord.id } }),
      prisma.refreshToken.create({
        data: {
          token: newRefreshToken,
          userId: user.id,
          expiresAt: getRefreshTokenExpiryDate(),
        },
      }),
    ]);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  async logout(refreshToken?: string) {
    if (refreshToken) {
      await prisma.refreshToken.deleteMany({
        where: { token: refreshToken },
      });
    }
    return { message: 'Logged out successfully' };
  }

  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return user;
  }
}

export const authService = new AuthService();
