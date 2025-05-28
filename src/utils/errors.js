class UserDenyError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UserDenyError';
  }
}

module.exports = { UserDenyError };