const express = require("express");
let session = require('cookie-session');
const bodyParser = require("body-parser")
const cors = require('cors')
const http = require("http")
const axios = require("axios")
const prisma = require("./db")
const NodeCache = require("node-cache");
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
const activeUsers = new Map()
const docs = require("./utils/docs.js")
const app = express();
const PORT = process.env.PORT
const {storage} = require("./utils/storage.js")
// const { initializeApp } = require("firebase/app");
const { getDownloadURL,ref } = require("firebase/storage")
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
let domain = process.env.DOMAIN
if(process.env.NODE_ENV=="dev"){
  domain =process.env.DEV_DOMAIN
}

app.use(cors())
app.options("*",cors())
const server = http.createServer(app);
const io = new Server(server,{    cors: {
    origin: "*",
    methods: ["GET", "POST", "PATCH","PUT", "DELETE", "OPTIONS"],
},});



function authMiddleware(req, res, next) {
  passport.authenticate('bearer', { session: false }, (err, user, info) => {

    if (err) return next(err); // Handle errors gracefully
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
  
    req.user = user; 
    next();
  })(req, res, next);
}
setUpPassportLocal(passport);

app.use(cors({ origin: "*" }));

const imageCache = new NodeCache({ stdTTL: 60 * 60 }); // 1 hour = 3600 seconds

// app.get("/image", async (req, res) => {
//   try {
//     const { path } = req.query;
//     if (!path) return res.status(400).send("Missing path");
    
//     // 1️⃣ Get Firebase download URL for the file
//     const fileRef = ref(storage, path);
//     const downloadUrl = await getDownloadURL(fileRef);
//     // 2️⃣ Fetch the image as a stream using Axios
//     const response = await axios.get(downloadUrl, {
//       responseType: "stream", // important!
//     });
//  // 💾 Cache the image data safely as a Buffer
// const bufferData = Buffer.from(response.data);

// imageCache.set(path, {
//   buffer: bufferData,
//   contentType: response.headers["content-type"] || "image/jpeg",
// });

//   // imageCache.set(path, {
//   //     buffer: response.data,
//   //     contentType: response.headers["content-type"] || "image/jpeg",
//   //   });
//     // 3️⃣ Set the content-type header (so IonImg knows what it is)
//   // imageCache.set(path, {
//   //     buffer: response.data,
//   //     contentType: response.headers["content-type"] || "image/jpeg",
//   //   });

//     // 📤 Send image response
// res.set("Content-Type", response.headers["content-type"] || "image/jpeg");
// res.send(bufferData);

//     // res.set("Content-Type", response.headers["content-type"]);
//     // res.send(response.data);
//     // 4️⃣ Pipe the response stream directly to the client
//     response.data.pipe(res);
//   } catch (error) {
//     console.error("Error fetching image:", error);
//     res.status(500).send("Error fetching image");
//   }
// });

app.get("/image", async (req, res) => {
  try {
    const { path } = req.query;
    if (!path) return res.status(400).send("Missing path");

    // Check cache first
    const cachedImage = imageCache.get(path);
    if (cachedImage) {
      console.log("✅ Serving cached image:", path);
      res.set("Content-Type", cachedImage.contentType);
      return res.send(cachedImage.buffer);
    }

    // 🔗 Get Firebase download URL
    const fileRef = ref(storage, path);
    const downloadUrl = await getDownloadURL(fileRef);

    // 🧩 Fetch as raw binary
    const response = await axios.get(downloadUrl, { responseType: "arraybuffer" });

    // 🧠 Convert to Buffer
    const bufferData = Buffer.from(response.data);

    // 💾 Cache the image
    imageCache.set(path, {
      buffer: bufferData,
      contentType: response.headers["content-type"] || "image/jpeg",
    });

    // 📤 Send response
    res.set("Content-Type", response.headers["content-type"] || "image/jpeg");
    res.send(bufferData);
  } catch (error) {
    console.error("❌ Error fetching image:", error.message);
    res.status(500).send("Error fetching image");
  }
});



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
    }}else{
      const updatedProfile = await prisma.profile.update({
        where: { id: profileId },
        data: {
          isActive: true,
        },include:{
            location:true
        }
      });

      console.log(`User ${updatedProfile.id}:${updatedProfile.username} connected`);
     
      activeUsers.set(socket.id, updatedProfile);
    }}catch(error){
        console.log("Socket registration",error.message)
    }})

  // Handle user disconnection
  socket.on('disconnect', async () => {
    const profile = activeUsers.get(socket.id); // Lookup profileId
   if(profile){
    const profileId = profile.id
    if (profileId) {
      try {
      
        await prisma.profile.update({
          where: { id: profileId },
          data: {
            isActive: false,
          },
        });
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