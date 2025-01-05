const express = require('express');
const prisma = require("../db");
const router = express.Router()
const server = require("../server")

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
function groupUsersByProximity({profile,items, radius = 50,}){
    const groups = [];
    while (items.length > 0) {
      const item = items.pop();
      const group = [item];
  
      items = items.filter((other) => {
        const distance = haversineDistance(item.location, other.location);
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
  function groupColsByProximity({profile,items, radius = 50,}){
    const groups = [];
    while (items.length > 0) {
      const item = items.pop();
    
  
      items = items.filter((other) => {
        const distance = haversineDistance(profile.location, other.location);
        if (distance <= radius) {
          // group.push(other);
          groups.push(other)
          return false;
        }
        return true;
      });
      
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
    router.get('/groups', authMiddleware,async (req, res) => {
      try {
       
       let profileList = await prisma.profile.findMany({where:{
        userId:{
            equals:req.user.id
        }},include:{
            location:true
        }})
        const profile = profileList[0]
       
        const radius = parseFloat(req.query.radius) || 50; // Default to 50 km
        const profiles = await prisma.profile.findMany({
          where: { isActive: true },include:{
            location:true
          },
        });
     
        const collections = await prisma.collection.findMany({
            where: {
              type: "feedback",
              location:{
                isNot:null
              },
       
            },
            include: {
                location:true,
                roles: true 
            }
          });


        const cols = groupColsByProximity({profile:profile,items:collections,radius})
        let groups = groupUsersByProximity({items:profiles, radius});
        groups = [...groups,...cols]
        res.json({ groups });
      } catch (error) {
        console.log(error)
        res.status(500).json({ error: error.message });
      }
    });
  
    return router;
  };
  