const express = require('express');
const prisma = require("../db");
const router = express.Router()
const{ generate} =require("random-words")
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
        const distance = haversineDistance(profile.location, other.location);
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
  const createNewWorkshopCollection=async ({profile})=>{
    let colName = generate({ min: 3, max: 6,join:" " })
 const role = await prisma.roleToCollection.create({data:{
      role:"editor",
      profile:{
        connect:{id:profile.id}
      },
      collection:{
        create:{
          title:colName,
          isPrivate:true,
          purpose:"Let's get feedback",
          isOpenCollaboration:false,
          type:"feedback",
          profile:{
            connect:{id:profile.id}
          },
          location:{
            connect:{
              id:profile.location.id
            }
            }
          }
        }
      },include:{
collection:{
        include:{
          roles:{
            include:{
              profile:true
            }
            
          },storyIdList:{include:{profile:true,story:true}}
        }
      },
      profile:true
      }     
    })
return role.collection
  }
  const findStoryToCollection = ({collectionId,storyId,profileId})=>{

    if(profileId){
      return prisma.storyToCollection.findFirst({where:{
        AND:[{profile:{
          id:{
            equals:profileId
          }
        }
            },{collection:{
  id:{
  equals:collectionId
  }
  }
  }]},include:{
  collection:{
  include:{
    location:true,
    storyIdList:{
      include:{
        story:{
          include:{
            author:true
          }
        }
      }
    }
    ,roles:{
      include:{
        profile:true
      }
    },
    profile:true
  }
  
  },
  profile:true,
  
  }})
    }else{
    return prisma.storyToCollection.findFirst({where:{
      AND:[{story:{
           id:{equals:storyId}
          }},{collection:{
id:{
equals:collectionId
}
}
}]},include:{
collection:{
include:{
  location:true,
  storyIdList:{
    include:{
      story:{
        include:{
          author:true
        }
      }
    }
  }
  ,roles:{
    include:{
      profile:true
    }
  },
  profile:true
}

},
profile:true,

}})
  }}
  const createStoryToCollection=async ({storyId,collectionId,profileId})=>{
    let colName = generate({ min: 3, max: 6,join:" " })

    if(collectionId){
return prisma.storyToCollection.create({data:{
    story:{
      connect:{
        id:storyId
      }
    },
    collection:{
    
    connectOrCreate:{
      where:{
        id:collectionId,
     
      },
      create:{
        title:colName,
        type:"feedback",
        profile:{
          connect:{id:profileId}
        },
        isPrivate:true,
        isOpenCollaboration:false,
        roles:{create:{
                role:"editor",
                profileId:profileId,
              
              }

        },
        profile:{
          connect:{id:profileId}
        }}}}}, include:{
          collection:{include:{
          profile:true,
         storyIdList:{
            include:{
              story:{include:{author:true}},
              profile:true
            }
          },
        location:true,
      roles:{
        include:{profile:true}
      }}}}})

}else{
  return prisma.storyToCollection.create({data:{
    story:{
      connect:{
        id:storyId
      }
    },
    collection:{
      create:{
        title:colName,
        type:"feedback",
        profile:{
          connect:{
            id:profileId,
          }
        },
        isPrivate:true,
        isOpenCollaboration:false,
        roles:{create:{
                role:"editor",
                profileId:profileId,
              
              },
      },
    profile:{
      connect:{id:profileId}
    }}}},include:{
      collection:{
        include:{
          profile:true,
          storyIdList:{
            include:{
              story:{include:{author:true}},
              profile:true
            }
          },
        location:true,
      roles:{
        include:{profile:true}
      }}
      }
    }}

)
}}
const findCollection= async({id})=>{
  return prisma.collection.findFirst({where:{id:
    {equals:id}},
  include:{
    location:true,
    storyIdList:{
      include:{
        story:{
          include:{
            author:true
          }
        }
      }
    },
    roles:{
      include:{
        profile:true
      }
    }
  }})
}
  function groupStoryByProximity({profile,items, radius = 50,}){
    const groups = [];
    while (items.length > 0) {
      const item = items.pop();
      const group = [item];
  
      items = items.filter((other) => {
        const distance = haversineDistance(profile.location, other.author.location);
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
    router.post('/active-users',authMiddleware, async (req, res) => {
      try {
        const {profile,story}=req.body
        const prof = await prisma.profile.update({
          where:{
            id:profile.id
      },data:{
        isActive:true
      }});
      const stor = await prisma.story.update({where:{id:story.id
      },data:{
        needsFeedback:true
      }})
    const profiles = await prisma.profile.findMany({where:{
        isActive:{
          equals:true
        }
      }})
        res.json({ profile:prof,story:stor,profiles});
      } catch (error) {
        res.status(500).json({ error: error});
      }
    });
  


    router.post('/groups', authMiddleware,async (req, res) => {
      try {
   
        const {story,profile}=req.body
       const prof = await prisma.profile.findFirst({where:{
          id:{
            equals:profile.id
          }
        },include:{
          location:true
        }})
        const radius = parseFloat(req.query.radius) || 50
      const profiles = await prisma.profile.findMany({where:{
        isActive:{
          equals:true
        }},include:{
            location:true,
            stories:{
              where:{
                needsFeedback:true
              }
            }
        }})
  
        const collections = await prisma.collection.findMany({
            where: {
              type:{
                equals:"feedback",
              },
              location:{
                isNot:null
              },
              
            },
            include: {
                location:true,
                roles: {
                  include:{profile:true}
                },
                storyIdList:{
                  include:{
                  story:{include:{author:true}}
                  }
                }
            }
          });
        let stories= await prisma.story.findMany({where:{
            author:{
              AND:[
                {isActive:true},
                {location:{
                  isNot:null
                }}
              ]
            },
            needsFeedback:{
              equals:true
            }
          },include:{
            author:{
              include:{
                location:true
              }
            }
          }})
        let cols = groupColsByProximity({profile:prof,items:collections,radius})
        let groups = groupUsersByProximity({profile:prof,items:profiles, radius});
       let groupedByStory= groupStoryByProximity({profile:prof,items:stories})
  
         cols = cols.filter(col=>{return col.roles.length<6})
      
         cols = cols.filter(col=>{
  
        let two = col.roles.find(role=>role.profile.id==prof.id)
  return !two 
})

      let closestGroup = groupedByStory[0]

        if(cols[0]){
    
      
            const col = cols[0]
   
              let role = await prisma.roleToCollection.create({
              data:{
                role:"editor",
                profile:{
                  connect:{
                    id:prof.id
                  }
                },
                collection:{
                  connect:{
                    id:col.id
                  }
                }
              }
            ,include:{
              collection:{
                include:{
                  roles:{
                    include:{
                      profile:true
                    }
                  },
                  location:true
                }      
              },
              profile:true
            }})
            let stc = await createStoryToCollection({storyId:story.id,collectionId:col.id,profileId:prof.id})
            await prisma.profile.update({where:{id:prof.id},data:{
              isActive:false
            }})
            res.json({collection:stc.collection})
          }else if(closestGroup && closestGroup.length>0){
              let storyGroup =closestGroup
          
              const workshopCol= await createNewWorkshopCollection(
                {profile:prof}
              )
              if(story){
                const stc =  await createStoryToCollection({storyId:story.id,collectionId:workshopCol.id,profileId:prof.id})
              }
                 for(let i =0;i<6;i++){
                  const otherStory = storyGroup[i]
                  if(otherStory.authorId!=profile.id){
                   let found = await findStoryToCollection({collectionId:workshopCol.id,storyId:otherStory.id,profileId:otherStory.authorId})
                  if(!found){
                    await createStoryToCollection({storyId:otherStory.id,collectionId:workshopCol.id,profileId:otherStory.authorId})
                  }
               }}
                  const col = await prisma.collection.findFirst({where:{id:{equals:workshopCol.id}},include:{
                    storyIdList:true,
                    location:true,
                 profile:true,
                    roles:{
                      include:{
                        profile:true
                      }
                    }
                  }})
                  res.json({collection:col})
              }else{
               let index=  groups.findIndex(0)
              if(index>-1){
               const newWorkshop = await createNewWorkshopCollection({profile:prof})
               const group = groups[0]
               const promises = group.map(profile=>{
                  let i = profile.stories.findIndex(0)
                  if(i>-1){
                   let story = profile.stories[0]
                  return createStoryToCollection({storyId:story.id,collectionId:newWorkshop.id,profileId:profile.id})
                  }
               })
               await Promise.all(promises)
               await prisma.profile.update({where:{
                id:prof.id
               },data:{
                isActive:false
               }})
              const col = await prisma.collection.findFirst({where:{id:{equals:newWorkshop.id}}})
              res.json({collection:col})
              return
            }else{
              res.json({error:new Error("Not enough users active in your area. Increase your radius")})
            }
          }
        } catch (error) {
          console.log(error)
        res.status(500).json({ error: error.message });
          }
        
        
        })
  
    return router;}
