const authService = require('./auth.service');

const login = async (req, res) => {
  const result = await authService.login(req.body);
  res.json(result);
};

module.exports = { login };
