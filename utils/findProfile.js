
const prisma = require("../db")

const findProfile= async (profileId)=>{
    return prisma.profile.findFirst({
        where: { id: profileId },
        include: 
          { location:true,
        
            user:{
              select:{
                lastLogin:true
              }
            },
          hashtag:{
            include:{
             hashtag:true
            
            }
          },
          profileToCollections: {
            include: {
              
              collection:{
                
                include:{
                  childCollections:{
                    select:{
                      childCollection:{
                        select:{
                          id:true,
                          title:true,
                          type:true,
                          
                        }
                      }
                    }
                  },
                 storyIdList:{
                  select:{
                    story:{
                      select:{
                        id:true,
                        title:true,
                        description:true,
                        type:true
                      }
                    }
                  
                  }
                 },
            }
              
              
            }
            }},_count:{
              select:{
                followers:true,
                following:true
              }
            }}
      })
}
module.exports=findProfile