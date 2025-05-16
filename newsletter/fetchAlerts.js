
const { profile } = require("console")
const prisma = require("../db")
const fetchEvents = require("./fetchEvents")
async function fetchAlerts(profile,days=1){
    let user = await prisma.user.findFirst({where:{
        profiles:{
            some:{
                id:profile.id
            }
        }
}})
    let events =await fetchEvents(days)

;
const lastEmailed = user.lastEmailed
    let collections =await prisma.collection.findMany({take:5,orderBy:{
        created:"desc"
    },where:{
        roles:{
            some:{
                profileId:profile.id
            }
        }
       
    }})
    const productsCount = await prisma.collection.count();
    const skip = Math.floor(Math.random() * productsCount);
    if(collections.length==0){}
   collections = await prisma.collection.findMany({take:5,
        orderBy:{
            created:"desc"
        },where:{
       AND:[
        {isPrivate:{
            equals:false
        }},
        {profileId:{
            not:profile.id
        }},
       ]
    
    },include:{
        storyIdList:{
            include:{
                story:{
                    include:{
                        author:true
                    }
                }
            }
        }
    }})

    let rTc =  await prisma.roleToCollection.findMany({orderBy:{
        created:"desc"
    },where:{
        profileId:{
            equals:profile.id
        }
    },include:{
        collection:{
            include:{
                storyIdList:{
                    where:{
                        created:{
                            gt:lastEmailed 
                        },
                    
                    },
                    include:{
                        story:{
                            include:{
                                author:true
                            }
                        }
                    }
                },
                childCollections:{
                    where:{
                        childCollection:{
                            // updated:{
                            //     gt:lastEmailed
                            // }
                        }
                    },
                    include:{
                        profile:true
                    }
                }
            }
        }
    }})
    const following = await prisma.follow.findMany({orderBy:{
        created:"desc"
    },where:{
        followerId:{
            equals:profile.id
        }
    },include:{
    following:{
        include:{
            collections:{
                // where:{
                //     created:{gt:lastEmailed}
                // },
                include:{
                    storyIdList:{
                        where:{
                            story:{
                                created:{
                                    gt:lastEmailed
                                }
                            }
                        },
                        include:{
                            story:{
                                include:{
                                    author:true
                                }
                            }
                        }
                    }
                }
            },
            stories:{
                where:{
                    OR:[{betaReaders:{
                        some:{
                            profileId:{
                                equals:profile.id
                            }
                        }
                    }},{isPrivate:false,}]
                    // ,created:{gt:lastEmailed}
                }
            }
        }
}}})
   let followers = await prisma.follow.findMany({orderBy:{
    created:"desc"
},where:{
        followingId:{
            equals:profile.id
        },
        created:{
            gt:lastEmailed
        }
    },include:{
        follower:true
    }})
    let comments = await prisma.comment.findMany({orderBy:{
        created:"desc"
    },where:{
        AND:[{story:{
            authorId:{
                equals:profile.id
            }
        }},
      
        // {
        //     updated:{
        //     gt:lastEmailed
        // }}
    ]
    },include:{
        profile:true,
        story:{
            include:{
                author:true
            }
        }
    }})
    let notify = {profile,comments,roles:rTc,following,followers,collections,events}
    return notify
}


module.exports = fetchAlerts
