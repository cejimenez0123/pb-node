const express = require('express');
const { Server } = require('socket.io');
const router = express.Router()
const server = http.createServer(router);
const io = new Server(server);

module.exports = io