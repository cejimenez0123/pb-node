const express = require("express");
let session = require('cookie-session');
const bodyParser = require("body-parser")
const cors = require('cors')
const http = require("http")
const prisma = require("./db")
const roleRoutes = require("./routes/role.js")
const authRoutes = require("./routes/auth")
const storyRoutes = require("./routes/story")
const collectionRoutes = require("./routes/collection")
const profileRoutes = require("./routes/profile")
const likeRoutes = require("./routes/like.js")
const historyRoutes = require("./routes/history.js")
const commentRoutes = require("./routes/comment.js")
const workshopRoutes = require("./routes/workshop.js")
const followRoutes = require("./routes/follow.js")
const passport = require("passport")
const hashtagRoutes = require("./routes/hashtag.js")
const {setUpPassportLocal}= require("./middleware/authMiddleware.js")
const { Server } = require('socket.io');
const updateWriterLevelMiddleware = require("./middleware/updateWriterLevelMiddleware.js");
const calculateStoryLimitMiddleware = require("./middleware/calculateStoryLimitMiddleware.js");


const activeUsers = new Map()

const app = express();
const PORT = process.env.PORT

app.use(bodyParser.urlencoded({ extended: false }))

const logger = (req, _res, next) => {
    const time = new Date().toLocaleTimeString();
    console.log(`${time} ${req.method}: ${req.url}`);
    next();
    };

app.use(bodyParser.json({limit: '50mb'}));
app.use(logger);
app.get('/', (req, res, next) => {

    res.status(200).json({message:"Hello World"})
})
const server = http.createServer(app);
const io = new Server(server,{    cors: {
    origin: process.env.DOMAIN,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
},});
app.use(cors())

// const authMiddleware = passport.authenticate('bearer', { session: false });

function authMiddleware(req, res, next) {
  passport.authenticate('bearer', { session: false }, (err, user, info) => {
  
    if (err) return next(err); // Handle errors gracefully
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
  
    req.user = user; 
    next();
  })(req, res, next);
}
setUpPassportLocal(passport);
// app.use(passport.initialize());
// const authMiddleware = passport.authenticate('bearer', { session: false });
app.use("/history",historyRoutes(authMiddleware))
app.use("/like",likeRoutes(authMiddleware))
app.use("/hashtag",hashtagRoutes(authMiddleware))
app.use("/role",roleRoutes(authMiddleware))
app.use("/auth",authRoutes(authMiddleware))
app.use("/story",storyRoutes({authMiddleware}))
app.use("/profile",profileRoutes(authMiddleware))
app.use("/collection",collectionRoutes(authMiddleware))
app.use("/comment",commentRoutes(authMiddleware))
app.use("/follow",followRoutes(authMiddleware))
app.use("/workshop",workshopRoutes(authMiddleware))
app.use(
    session({
    secret: process.env.JWT_SECRET,resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
    }))


    app.use(passport.session());
    app.use(passport.initialize());


io.on('connection', (socket) => {



  // Register user
  socket.on('register', async ({ profileId, location }) => {
    try {
       
      // Update the database
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
           
         }
try{
      const updatedProfile = await prisma.profile.update({
        where: { id: profileId },
        data: {
          isActive: true,
          location:{
            connect:{
                id:locale.id
            }
          }
        },include:{
            location:true
        }
      });
    
      activeUsers.set(socket.id, updatedProfile);
    }catch(error){
        console.error( error); 
    }}}catch(error){
        console.log("Socket registration",error.message)
    }})

  // Handle user disconnection
  socket.on('disconnect', async () => {
    const profile = activeUsers.get(socket.id); // Lookup profileId
   if(profile){
    const profileId = profile.id
    if (profileId) {
      try {
        // Update the database
        await prisma.profile.update({
          where: { id: profileId },
          data: {
            isActive: false,
          },
        });

        // Remove from memory
        activeUsers.delete(socket.id);

        console.log(`User ${profileId} disconnected`);
      } catch (error) {
        console.error('Error during disconnection:', error.message);
      }
    }}
  });
});

server.listen(PORT, () => {
        console.log(`Server is running`+PORT)
        })

    

         




module.exports = server