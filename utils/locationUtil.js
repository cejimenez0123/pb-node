const prisma = require("../db")

const createLocation = async (location)=>{
    let locale= null

if(location){
    locale = await  prisma.location.findFirst({where:{
    latitude:{
        equals:location.latitude
    },
    longitude:{
        equals:location.longitude
    }
  }})
  if(!locale){
    locale = await prisma.location.create({data:{
          latitude:location.latitude,
          longitude:location.longitude
       }})
    }else{
        locale = await prisma.location.findFirst()
       
     }}else{
        return location
     }
    
    return locale

}

module.exports = {createLocation}