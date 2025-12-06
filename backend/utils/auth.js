const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'openwork_default_secret_change_in_production';
const SESSION_EXPIRY_HOURS = parseInt(process.env.SESSION_EXPIRY_HOURS) || 24;

/**
 * Verify admin credentials
 */
function verifyAdminCredentials(username, password) {
  const adminUsername = process.env.ADMIN_USERNAME || 'openwork';
  const adminPassword = process.env.ADMIN_PASSWORD || 'openwork123';
  
  return username === adminUsername && password === adminPassword;
}

/**
 * Generate JWT token for admin session
 */
function generateAdminToken(username) {
  const payload = {
    username,
    role: 'admin',
    iat: Math.floor(Date.now() / 1000)
  };
  
  const options = {
    expiresIn: `${SESSION_EXPIRY_HOURS}h`
  };
  
  return jwt.sign(payload, JWT_SECRET, options);
}

/**
 * Verify JWT token
 */
function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return { valid: true, decoded };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

/**
 * Express middleware to require admin authentication
 */
function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'No authorization token provided'
    });
  }
  
  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  const verification = verifyToken(token);
  
  if (!verification.valid) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
      details: verification.error
    });
  }
  
  // Check if user is admin
  if (verification.decoded.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Insufficient permissions'
    });
  }
  
  // Attach user info to request
  req.admin = verification.decoded;
  next();
}

module.exports = {
  verifyAdminCredentials,
  generateAdminToken,
  verifyToken,
  requireAdmin
};
