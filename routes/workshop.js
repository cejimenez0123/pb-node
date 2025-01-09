const express = require('express');
const prisma = require("../db");
const router = express.Router()
const server = require("../server")
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
  const createStoryToCollection=({storyId,collectionId,profileId})=>{
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
        res.json({ profiles: [prof],story:stor });
      } catch (error) {
        res.status(500).json({ error: error.message });
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
       let profiles = await prisma.profile.findMany({where:{
        isActive:{
          equals:true
        }},include:{
            location:true
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
        let cols = groupColsByProximity({profile:profile,items:collections,radius})
        // let groups = groupUsersByProximity({items:profiles, radius});
       let storis= groupStoryByProximity({profile,items:stories})
  
         cols = cols.filter(col=>{return col.roles.length<6})
         console.log(cols)
      
         cols = cols.filter(col=>{
  
        let two = col.roles.find(role=>role.profile.id==prof.id)
  return !two 
})
console.log("BobS",cols[0])
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
       await createStoryToCollection({storyId:story.id,collectionId:col.id,profileId:prof.id})

          const collect = await prisma.collection.findFirst({where:{id:
            {equals:col.id}},
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
          console.log("Cvcvvc",collect) 
           res.json({collection:collect})
          
              
          
          }else if(storis[0]){
              let storyGroup =storis[0]
              let colName = generate({ min: 3, max: 6,join:" " })
              const role = await prisma.roleToCollection.create({data:{
                  role:"editor",
                  profile:{
                    connect:{id:prof.id}
                  },
                  collection:{
                    
                    create:{
              
                      title:colName,
                      isPrivate:true,
                      purpose:"Let's get feedback",
                      isOpenCollaboration:false,
                      type:"feedback",
                      profile:{
                        connect:{id:prof.id}
                      },
                      location:{
                        connect:{
                          id:prof.location.id
                        }
                        }
                      },
                      
                    }
                  },include:{
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
                  }     
                })

                await prisma.storyToCollection.create({
                  data:{
                    collection:{
                      connect:{
                        id:role.collectionId
                      }
                    },
                    story:{
                      connect:{
                        id:story.id
                      }
                    },profile:{
                      connect:{
                        id:prof.id
                      }
                    }
                  }
                })
      let found = null
                
      for(let i =0;i<i;i++){
          const otherStory = storyGroup[i]
          if(otherStory.authorId!=profile.id){

          found = await prisma.storyToCollection.findFirst({where:{
            AND:[{story:{
                 id:{equals:otherStory.id}
                }},{collection:{
    id:{
      equals:role.collectionId
    }
   }}]},include:{
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
  
   }})}
 if(!found){
  found =  await createStoryToCollection({storyId:otherStory.id,collectionId:role.collectionId,profileId:otherStory.authorId})
 }
    }
    let col = await prisma.collection.findFirst({where:{id:{equals:role.collectionId}},
    include:{
      storyIdList:{
        include:{
          story:{
            include:{
              author:true
            }
          }
        }
      },
      location:true,
      roles:{
        include:{
          profile:true
        }
      }
    }})
    console.log("FDFd",col)
   res.json({collection:col})


   }else{
          let colName = generate({ min: 3, max: 6,join:" " })
        const role = await prisma.roleToCollection.create({data:{
            role:"editor",
            profile:{
              connect:{id:prof.id}
            },
            collection:{
              create:{
                title:colName,
                isPrivate:true,
                purpose:"Let's get feedback",
                isOpenCollaboration:false,
                type:"feedback",
                profile:{
                  connect:{id:prof.id}
                },
                location:{
                  connect:{
                    id:prof.location.id
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
        const found = await prisma.storyToCollection.findFirst({where:{
            AND:[{
              profileId:{
                equals:prof.id
              }
            },{storyId:{
              equals:story.id
            }},{
              collectionId:{
                equals:role.collectionId
              }
            }]
          },include:{
            collection:{
              include:{
                profile:true,
              
                roles:{
                  include:{profile:true}
                },
                location:true,
                storyIdList:{
                  include:{
                    story:{include:{
                      author:true,
                      
                    }}
                  }
                }
              }
            }
          }
        })
        if(found){ 
        console.log(1,found.collection)
            res.json({collection:found.collection})
          }else{
console.log("L")
      let sTc = await createStoryToCollection({storyId:story.id,collectionId:role.collectionId,profileId:prof.id})
      console.log(2,sTc.collection)
 
          res.json({collection:sTc.collection})
  
             }
            }
            } catch (error) {
        console.log(error)
        res.status(500).json({ error: error.message });
      }
    });
  
    return router;
  };
  