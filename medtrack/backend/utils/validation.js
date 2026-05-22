/**
 * Utility validation helper functions for MedTrack registration fields.
 */

function validateUsername(username) {
  if (!username || typeof username !== 'string') return false;
  // 3-20 characters, letters, numbers, underscores, hyphens only
  const regex = /^[a-zA-Z0-9_-]{3,20}$/;
  return regex.test(username);
}

function validatePassword(password) {
  if (!password || typeof password !== 'string') return false;
  // 8-30 characters, at least one letter, at least one number, no spaces
  const regex = /^(?=.*[A-Za-z])(?=.*\d)\S{8,30}$/;
  return regex.test(password);
}

function validatePhone(phone) {
  // Phone is optional/nullable, but if provided, it must be exactly 10 digits
  if (phone === undefined || phone === null || phone === '') return true;
  if (typeof phone !== 'string') return false;
  const regex = /^\d{10}$/;
  return regex.test(phone);
}

function validateName(name) {
  if (!name || typeof name !== 'string') return false;
  // 2-50 characters, letters, spaces, dots, hyphens
  const regex = /^[a-zA-Z\s.-]{2,50}$/;
  return regex.test(name);
}

module.exports = {
  validateUsername,
  validatePassword,
  validatePhone,
  validateName
};
