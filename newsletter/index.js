
const prisma = require('../db');
const workshopTemplate = require('../html/workshopTemplate');
const sleep = require('../utils/sleep');

const sendEmail = require("./sendEmail")
const emails = ["christianjimenez0123@gmail.com","mayavantifelman@gmail.com","jonesj773@gmail.com","yeamabangura00@gmail.com","shakevag98@gmail.com","aisatousaho133@gmail.com","m.k.angelo721@gmail.com"]

const sendEmails=async ()=>{
  let users = await prisma.user.findMany({where:{
    AND:[{emailFrequency:{not:0}},{email:{notIn:emails}}]

  }})
  await prisma.user.updateMany({where:{
    emailFrequency:{not:0}
  },data:{
    lastEmailed:new Date()
  }})

  for(let i = 0;i<users.length;i+=1){
  const template = workshopTemplate(users[i])
await sleep(900)
 let res = await sendEmail(template)
 console.log(i+emails.length,users[i].email)
  }
return "success"
}
  




module.exports =sendEmails


