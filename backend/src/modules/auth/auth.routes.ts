import { Router } from 'express';
import {
  register,
  login,
  refreshToken,
  logout,
  getMe,
} from './auth.controller.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { registerSchema, loginSchema } from './auth.validation.js';

const router = Router();

router.post('/register', validate({ body: registerSchema }), register);
router.post('/login', validate({ body: loginSchema }), login);
router.post('/refresh', refreshToken);
router.post('/logout', logout);
router.get('/me', authenticate, getMe);

export default router;
