const prisma = require("../db")
const findProfile = require("./findProfile")

  
  module.exports = async function createNewProfileForUser({username,profilePicture,selfStatement,isPrivate,userId}){
      const profile = await prisma.profile.create({
        data:{
            username:username?.toLowerCase(),
            profilePic:profilePicture,
            selfStatement,
            isPrivate:isPrivate,
            user:{
                connect:{
                    id:userId
                }
            }
        }
    })
       const portCol = await prisma.collection.create({data:{
      title:"Portfolio",
      purpose:"Showcase your work and collaborations",
      isOpenCollaboration:false,
      isPrivate:true,
      profile:{
        connect:{
          id:profile.id
        }
      }
    }
    })
   const homeCol = await prisma.collection.create({data:{
      title:"Home",
      purpose:"Add Collections to home to up with updates",
      isOpenCollaboration:false,
      isPrivate:true,
      profile:{
        connect:{
          id:profile.id
        }
      }
    }
    })
       const eventCol = await prisma.collection.create({data:{
      title:"Events",
      purpose:"Add Collections to home to up with updates",
      isOpenCollaboration:false,
      isPrivate:true,
      profile:{
        connect:{
          id:profile.id
        }
      }
    }
    })

  const archCol= await prisma.collection.create({data:{
      title:"Archive",
      purpose:"Save things for later",
      isOpenCollaboration:false,
      isPrivate:true,
      profile:{
        connect:{
          id:profile.id
        }
      }
    }
    })

    await prisma.profileToCollection.create({
      data:{
        collection:{
          connect:{
            id:eventCol.id
          }
        },
        type:"events",
        profile:{
          connect:{
            id:profile.id
          }
        }
      }
    })
        await prisma.profileToCollection.create({
      data:{
        collection:{
          connect:{
            id:portCol.id
          }
        },
        type:"portfolio",
        profile:{
          connect:{
            id:profile.id
          }
        }
      }
    })
    await prisma.profileToCollection.create({
      data:{
        collection:{
          connect:{
            id:homeCol.id
          }
        },
        type:"home",
        profile:{
          connect:{
            id:profile.id
          }
        }
      }
    })
await prisma.profileToCollection.create({
  data: {
    collection: {
      connect: {
        id: archCol.id
      }
    },
    type: "archive",
    profile: {
      connect: {
        id: profile.id
      }
    }
  }
})



   let newProfile = await findProfile(profile.id)
    return newProfile 
  }