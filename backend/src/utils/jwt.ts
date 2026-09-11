import jwt, { type SignOptions } from 'jsonwebtoken';
import type { Response } from 'express';
import { env } from '../config/env.js';
import type { Role } from '../config/prisma.js';

export interface JwtUserPayload {
  userId: string;
  email: string;
  role: Role;
  name?: string | null;
}

export const generateAccessToken = (payload: JwtUserPayload): string => {
  const options: SignOptions = {
    expiresIn: env.ACCESS_TOKEN_EXPIRES_IN as SignOptions['expiresIn'],
  };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, options);
};

export const generateRefreshToken = (payload: JwtUserPayload): string => {
  const options: SignOptions = {
    expiresIn: env.REFRESH_TOKEN_EXPIRES_IN as SignOptions['expiresIn'],
  };
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, options);
};

export const verifyAccessToken = (token: string): JwtUserPayload => {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtUserPayload;
};

export const verifyRefreshToken = (token: string): JwtUserPayload => {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtUserPayload;
};

export const REFRESH_TOKEN_COOKIE_NAME = 'refreshToken';

export const setRefreshTokenCookie = (res: Response, token: string): void => {
  const isProduction = env.NODE_ENV === 'production';
  res.cookie(REFRESH_TOKEN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  });
};

export const clearRefreshTokenCookie = (res: Response): void => {
  const isProduction = env.NODE_ENV === 'production';
  res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    path: '/',
  });
};
