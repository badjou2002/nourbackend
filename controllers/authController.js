const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const asyncHandler = require('../utils/asyncHandler');

const register = asyncHandler(async (req, res) => {
  const { email, password, name, address, phone } = req.body;
  const existing = await User.findOne({ email });
  if (existing) {
    res.status(400);
    throw new Error('Un compte existe déjà avec cet email');
  }
  const user = await User.create({ email, password, name, address, phone });
  res.status(201).json({
    success: true,
    data: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      address: user.address,
      phone: user.phone,
      token: generateToken(user._id),
    },
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.matchPassword(password))) {
    res.status(401);
    throw new Error('Email ou mot de passe incorrect');
  }
  if (!user.isActive) {
    res.status(403);
    throw new Error('Compte désactivé, contactez l’administration');
  }
  res.json({
    success: true,
    data: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      address: user.address,
      phone: user.phone,
      token: generateToken(user._id),
    },
  });
});

const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('-password');
  res.json({ success: true, data: user });
});

const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone, address, password } = req.body;
  const user = await User.findById(req.user._id).select('+password');
  if (!user) {
    res.status(404);
    throw new Error('Utilisateur introuvable');
  }
  if (name !== undefined) {
    if (!String(name).trim()) {
      res.status(400);
      throw new Error('Le nom ne peut pas être vide');
    }
    user.name = name;
  }
  if (phone !== undefined) user.phone = phone;
  if (address !== undefined) user.address = address;
  if (password) {
    if (String(password).length < 6) {
      res.status(400);
      throw new Error('Le mot de passe doit contenir au moins 6 caractères');
    }
    user.password = password;
  }
  await user.save();
  res.json({
    success: true,
    data: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      address: user.address,
      phone: user.phone,
    },
  });
});

module.exports = { register, login, getMe, updateProfile };
