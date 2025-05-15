
const { profile } = require("console")
const prisma = require("../db")
const fetchEvents = require("./fetchEvents")
async function fetchAlerts(profile){
    let user = await prisma.user.findFirst({where:{
        profiles:{
            some:{
                id:profile.id
            }
        }
}})
    let events =await fetchEvents(1)

;
const lastEmailed = user.lastEmailed
    prisma.collection.findMany({where:{
        followersAre:{
            
        }
    }})
    const collections = await prisma.collection.findMany({where:{
       AND:[
        {isPrivate:{
            equals:false
        }},
        {profileId:{
            not:profile.id
        }},
        // {created:{
        //     gt:lastEmailed
        // }}
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

    let rTc =  await prisma.roleToCollection.findMany({where:{
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
    const following = await prisma.follow.findMany({where:{
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
   let followers = await prisma.follow.findMany({where:{
        followingId:{
            equals:profile.id
        },
        created:{
            gt:lastEmailed
        }
    },include:{
        follower:true
    }})
    let comments = await prisma.comment.findMany({where:{
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
