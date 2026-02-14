import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { generateToken } from '../utils/jwt.js';
import { 
  ValidationError, 
  ConflictError, 
  AuthenticationError,
  InternalServerError 
} from '../utils/errors.js';
import { 
  validateEmail_, 
  validatePassword_, 
  validateString,
  validateRequired 
} from '../utils/validators.js';
import { 
  getUserByEmail, 
  createUser 
} from '../services/supabase-service.js';

const router = Router();

/**
 * POST /auth/signup
 * Register a new user
 */
router.post('/signup', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, displayName } = req.body;

    // Validate inputs
    validateEmail_(email);
    validatePassword_(password);
    validateString(displayName, 'Display name', 2, 100);

    // Check if user already exists
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      throw new ConflictError('Email already in use');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user in database
    const user = await createUser(email, passwordHash, displayName);

    // Generate token
    const token = generateToken({
      userId: user.id,
      email: user.email,
    });

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /auth/login
 * Login with email and password
 */
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    // Validate inputs
    validateEmail_(email);
    validateRequired(password, 'Password');

    // Find user by email
    const user = await getUserByEmail(email);
    if (!user) {
      throw new AuthenticationError('Invalid email or password');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      throw new AuthenticationError('Invalid email or password');
    }

    // Generate token
    const token = generateToken({
      userId: user.id,
      email: user.email,
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /auth/refresh
 * Refresh authentication token
 */
router.post('/refresh', (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.userId || !req.userEmail) {
      throw new AuthenticationError('No valid session');
    }

    const token = generateToken({
      userId: req.userId,
      email: req.userEmail,
    });

    res.json({ token });
  } catch (error) {
    next(error);
  }
});

export default router;
