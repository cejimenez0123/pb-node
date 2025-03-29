const fetchPublicEvents = require("./fetchPublicEvents");
const sendEmail = require("./sendEmail")
const eventNewsletterTemplate = require('../html/eventNewsletterTemplate');
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));


}

const sendWeeklyEmail=async (users)=>{

    // const users = await prisma.user.findMany({where:{emailFrequency:{equals:7}}})
let i =0 
for(const user of users){
    await sleep(1100)

  sendEventNewsletterEmail(user).then(res=>{
        i+=1

    }).catch(err=>{
      console.log(err)
    })
}
}   
const sendEventNewsletterEmail=async (user)=>{
  let downtownEvents = await fetchPublicEvents(process.env.DOWNTOWN_CAL_ID)
  let uptownEvents = await fetchPublicEvents(process.env.UPTOWN_CAL_ID)
  let queensEvents = await fetchPublicEvents(process.env.QUEENS_CAL_ID)
  let virtualEvents = await fetchPublicEvents(process.env.VIRTUAL_CAL_ID)
  const events=[{area:"Downtown",events:downtownEvents},{area:"Uptown",events:uptownEvents},{area:"Queens",events:queensEvents},{area:"Virtual",events:virtualEvents}]

      const template =  eventNewsletterTemplate({events,email:user})
    sendEmail(template).then(res=>{
      // i+=1
console.log("BORG")
  }).catch(err=>{
    console.log(err)
  })

  
} 

module.exports =sendWeeklyEmail
