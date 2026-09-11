import type { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service.js';
import {
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
  REFRESH_TOKEN_COOKIE_NAME,
} from '../../utils/jwt.js';
import { sendSuccess, UnauthorizedError } from '../../utils/errors.js';

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await authService.register(req.body);
    setRefreshTokenCookie(res, result.refreshToken);

    return sendSuccess(
      res,
      {
        user: result.user,
        accessToken: result.accessToken,
      },
      'User registered successfully',
      201
    );
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await authService.login(req.body);
    setRefreshTokenCookie(res, result.refreshToken);

    return sendSuccess(
      res,
      {
        user: result.user,
        accessToken: result.accessToken,
      },
      'Logged in successfully',
      200
    );
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const incomingRefreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME];
    if (!incomingRefreshToken) {
      throw new UnauthorizedError('Refresh token cookie missing');
    }

    const result = await authService.refreshTokens(incomingRefreshToken);
    setRefreshTokenCookie(res, result.refreshToken);

    return sendSuccess(
      res,
      {
        user: result.user,
        accessToken: result.accessToken,
      },
      'Tokens refreshed successfully',
      200
    );
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const incomingRefreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME];
    await authService.logout(incomingRefreshToken);
    clearRefreshTokenCookie(res);

    return sendSuccess(res, null, 'Logged out successfully', 200);
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Not authenticated');
    }

    const user = await authService.getMe(req.user.userId);
    return sendSuccess(res, { user }, 'Current user profile fetched successfully', 200);
  } catch (error) {
    next(error);
  }
};