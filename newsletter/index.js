
const prisma = require('../db');
const notificationTemplate = require('../html/notificationTemplate');
const slackEventTemplate = require('../html/slackEventTemplate');
const workshopTemplate = require('../html/workshopTemplate');
const sleep = require('../utils/sleep');
const fetchAlerts = require('./fetchAlerts');

const sendEmail = require("./sendEmail")
const emails = ["christianjimenez0123@gmail.com"]

// const sendEmails=async ()=>{
//   let users = await prisma.user.findMany({where:{
//     AND:[{emailFrequency:{not:0}},{email:{notIn:emails}}]

//   }})
//   await prisma.user.updateMany({where:{
//     emailFrequency:{not:0}
//   },data:{
//     lastEmailed:new Date()
//   }})

//   for(let i = 0;i<users.length;i+=1){
//   const template = slackEventTemplate({email:users[i].email})
// await sleep(900)
//  let res = await sendEmail(template)
//  console.log(i+emails.length,users[i].email)
//   }
// return "success"
// }
async function sendEmails(){
   let profile = await prisma.profile.findFirst({where:{user:{email:{equals:emails[0]}}}})
   let notify = await fetchAlerts(profile)

const dummyData = {
    profile: {
      username: "solwrites",
    },
    comments: [
      {
        content: "This line hit me right in the heart. Beautiful!",
        profile: { username: "josue_t" },
        storyTitle: "City of Mirrors",
        storyUrl: "https://plumbum.app/stories/city-of-mirrors"
      },
      {
        content: "The pacing in your second stanza was 🔥🔥🔥",
        profile: { username: "majora_writes" },
        storyTitle: "Unfinished Symphony",
        storyUrl: "https://plumbum.app/stories/unfinished-symphony"
      }
    ],
    roles: [], // If unused, you can leave this empty
    following: [],
    followers: [
      {
        follower: { username: "rose_poems" },
        created: "May 10, 2025"
      },
      {
        follower: { username: "neo_narrative" },
        created: "May 11, 2025"
      }
    ],
    collections: [
      {
        title: "Queer Sci-Fi Zine Vol. 1",
        updated: "May 9, 2025"
      },
      {
        title: "Plumbum Picks - Spring 2025",
        updated: "May 7, 2025"
      }
    ],
    events: [] // Your template does not use this field currently
  };
   let email = notificationTemplate({email:emails[0]},notify)
   sendEmail(email)
}

sendEmails().then(res=>{})
module.exports =sendEmails


