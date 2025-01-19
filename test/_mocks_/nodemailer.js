const nodemailer = jest.createMockFromModule('nodemailer');

// Mock createTransport and sendMail
nodemailer.createTransport = jest.fn().mockReturnValue({
  sendMail: jest.fn().mockResolvedValue('Email sent'),
});

module.exports = nodemailer;