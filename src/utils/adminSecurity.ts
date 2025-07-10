// Admin security utilities

export interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  blockDurationMs: number;
}

export interface LoginAttempt {
  timestamp: number;
  ip?: string;
  userAgent?: string;
  success: boolean;
}

class AdminSecurity {
  private static instance: AdminSecurity;
  private loginAttempts: Map<string, LoginAttempt[]> = new Map();
  private blockedIPs: Map<string, number> = new Map();

  private rateLimitConfig: RateLimitConfig = {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    blockDurationMs: 30 * 60 * 1000 // 30 minutes
  };

  static getInstance(): AdminSecurity {
    if (!AdminSecurity.instance) {
      AdminSecurity.instance = new AdminSecurity();
    }
    return AdminSecurity.instance;
  }

  // Check if IP is currently blocked
  isBlocked(identifier: string): boolean {
    const blockUntil = this.blockedIPs.get(identifier);
    if (blockUntil && Date.now() < blockUntil) {
      return true;
    }
    
    if (blockUntil) {
      this.blockedIPs.delete(identifier);
    }
    return false;
  }

  // Record a login attempt
  recordAttempt(identifier: string, success: boolean, ip?: string, userAgent?: string): boolean {
    if (this.isBlocked(identifier)) {
      return false;
    }

    const now = Date.now();
    const attempts = this.loginAttempts.get(identifier) || [];
    
    // Clean old attempts outside the window
    const validAttempts = attempts.filter(
      attempt => now - attempt.timestamp < this.rateLimitConfig.windowMs
    );

    // Add new attempt
    validAttempts.push({
      timestamp: now,
      ip,
      userAgent,
      success
    });

    this.loginAttempts.set(identifier, validAttempts);

    // Check if we should block this identifier
    if (!success) {
      const failedAttempts = validAttempts.filter(attempt => !attempt.success);
      if (failedAttempts.length >= this.rateLimitConfig.maxAttempts) {
        this.blockedIPs.set(identifier, now + this.rateLimitConfig.blockDurationMs);
        return false;
      }
    }

    return true;
  }

  // Get remaining attempts before block
  getRemainingAttempts(identifier: string): number {
    if (this.isBlocked(identifier)) {
      return 0;
    }

    const attempts = this.loginAttempts.get(identifier) || [];
    const now = Date.now();
    const validAttempts = attempts.filter(
      attempt => now - attempt.timestamp < this.rateLimitConfig.windowMs && !attempt.success
    );

    return Math.max(0, this.rateLimitConfig.maxAttempts - validAttempts.length);
  }

  // Get time until unblock
  getBlockTimeRemaining(identifier: string): number {
    const blockUntil = this.blockedIPs.get(identifier);
    if (!blockUntil) return 0;
    
    return Math.max(0, blockUntil - Date.now());
  }

  // Clear attempts for identifier (useful after successful login)
  clearAttempts(identifier: string): void {
    this.loginAttempts.delete(identifier);
    this.blockedIPs.delete(identifier);
  }

  // Validate session token format
  validateSessionToken(token: string): boolean {
    // Basic token format validation
    const tokenPattern = /^[a-zA-Z0-9_-]+$/;
    return tokenPattern.test(token) && token.length >= 20 && token.length <= 100;
  }

  // Generate secure session token
  generateSessionToken(): string {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substr(2, 15);
    const additionalRandom = crypto.getRandomValues(new Uint8Array(8))
      .reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '');
    
    return `admin_${timestamp}_${randomPart}_${additionalRandom}`;
  }

  // Sanitize input to prevent injection attacks
  sanitizeInput(input: string): string {
    return input
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/['"]/g, '') // Remove quotes
      .replace(/[;]/g, '') // Remove semicolons
      .trim()
      .substring(0, 100); // Limit length
  }

  // Validate admin role
  validateAdminRole(role: string): boolean {
    const validRoles = ['admin', 'super_admin'];
    return validRoles.includes(role);
  }

  // Check password strength
  validatePasswordStrength(password: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Log security event
  logSecurityEvent(event: {
    type: 'login_attempt' | 'login_success' | 'login_blocked' | 'session_expired' | 'unauthorized_access';
    identifier: string;
    ip?: string;
    userAgent?: string;
    details?: any;
  }): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      ...event
    };
    
    // In production, this would send to a security monitoring system
    console.log('Security Event:', logEntry);
    
    // Store in localStorage for demo purposes
    const securityLogs = JSON.parse(localStorage.getItem('admin_security_logs') || '[]');
    securityLogs.push(logEntry);
    
    // Keep only last 100 entries
    if (securityLogs.length > 100) {
      securityLogs.splice(0, securityLogs.length - 100);
    }
    
    localStorage.setItem('admin_security_logs', JSON.stringify(securityLogs));
  }

  // Get security logs
  getSecurityLogs(): any[] {
    return JSON.parse(localStorage.getItem('admin_security_logs') || '[]');
  }
}

export const adminSecurity = AdminSecurity.getInstance();

// Input validation utilities
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
  return phoneRegex.test(phone);
};

export const sanitizeUserInput = (input: string): string => {
  return adminSecurity.sanitizeInput(input);
};

// Session management utilities
export const isSessionExpired = (expiresAt: string): boolean => {
  return new Date(expiresAt) <= new Date();
};

export const extendSession = (currentExpiresAt: string, extensionHours: number = 8): string => {
  const currentExpiry = new Date(currentExpiresAt);
  const now = new Date();
  
  // Only extend if session is still valid
  if (currentExpiry > now) {
    return new Date(now.getTime() + extensionHours * 60 * 60 * 1000).toISOString();
  }
  
  return currentExpiresAt;
};