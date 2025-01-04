const express = require('express');
const prisma = require("../db");
const router = express.Router()
const server = require("../server")
const { Server } = require('socket.io');
const activeUsers = new Map()
const haversineDistance = (loc1, loc2) => {
    const toRad = (value) => (value * Math.PI) / 180;
    const R = 6371; // Earth radius in km
    const dLat = toRad(loc2.latitude - loc1.latitude);
    const dLon = toRad(loc2.longitude - loc1.longitude);
  
    const lat1 = toRad(loc1.latitude);
    const lat2 = toRad(loc2.latitude);
  
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  };
function groupUsersByProximity(users, radius = 50){
    const groups = [];
  
    while (users.length > 0) {
      const user = users.pop();
      const group = [user];
  
      users = users.filter((other) => {
        const distance = haversineDistance(user.location, other.location);
        if (distance <= radius) {
          group.push(other);
          return false;
        }
        return true;
      });
  
      groups.push(group);
    }
  
    return groups;
  };
module.exports = function (authMiddleware) {
    

  
    // Route: Get active users
    router.get('/active-users', async (req, res) => {
      try {
        const users = await prisma.profile.findMany({
          where: { isActive: true },
        });
        res.json({ profiles: users });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
  
    // Route: Get grouped users by proximity
    router.get('/groups', async (req, res) => {
      try {
        const radius = parseFloat(req.query.radius) || 50; // Default to 50 km
        const profiles = await prisma.profile.findMany({
          where: { isActive: true },include:{
            location:true
          },
        });
        // console.log(profiles)
        const groups = groupUsersByProximity(profiles, radius);
        console.log("Group",groups)
        res.json({ groups });
      } catch (error) {
        console.log(error)
        res.status(500).json({ error: error.message });
      }
    });
  
    return router;
  };
  