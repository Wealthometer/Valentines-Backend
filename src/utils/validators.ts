import { ValidationError } from './errors.js';

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePassword(password: string): boolean {
  // Minimum 8 characters, at least one uppercase, one lowercase, one number
  return password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password);
}

export function validateRequired(value: unknown, fieldName: string): void {
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    throw new ValidationError(`${fieldName} is required`);
  }
}

export function validateString(value: unknown, fieldName: string, minLength?: number, maxLength?: number): void {
  validateRequired(value, fieldName);
  
  if (typeof value !== 'string') {
    throw new ValidationError(`${fieldName} must be a string`);
  }

  if (minLength && value.length < minLength) {
    throw new ValidationError(`${fieldName} must be at least ${minLength} characters`);
  }

  if (maxLength && value.length > maxLength) {
    throw new ValidationError(`${fieldName} must not exceed ${maxLength} characters`);
  }
}

export function validateEmail_(email: string): void {
  validateRequired(email, 'Email');
  
  if (!validateEmail(email)) {
    throw new ValidationError('Invalid email format');
  }
}

export function validatePassword_(password: string): void {
  validateRequired(password, 'Password');
  validateString(password, 'Password', 8, 128);
  
  if (!validatePassword(password)) {
    throw new ValidationError(
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    );
  }
}

export function validateUUID(value: string, fieldName: string = 'ID'): void {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(value)) {
    throw new ValidationError(`Invalid ${fieldName} format`);
  }
}
