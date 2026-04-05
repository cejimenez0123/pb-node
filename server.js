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
const algoliaRoutes = require("./routes/algolia.js")
const workshopRoutes = require("./routes/workshop.js")
const followRoutes = require("./routes/follow.js")
const passport = require("passport")
const hashtagRoutes = require("./routes/hashtag.js")
const {setUpPassportLocal}= require("./middleware/authMiddleware.js")
const { Server } = require('socket.io');
require('dotenv').config();
const activeUsers = new Map()
const docs = require("./utils/docs.js")
const app = express();
const PORT = process.env.PORT
const {storage} = require("./utils/storage.js")
const Sentry = require("@sentry/node");
try{
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  sendDefaultPii: true,
});
}catch(err){
  
}

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


app.use("/api/algolia",algoliaRoutes(authMiddleware))
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
  socket.on("register", async ({ profileId, location }) => {
  try {
    let localeId;

    if (location) {
      const locale = await findOrCreateLocation(location.latitude, location.longitude,location.city);
      localeId = locale.id;
    }

    const updatedProfile = await updateProfileWithRetry(profileId, localeId);

    activeUsers.set(socket.id, updatedProfile);
  } catch (error) {
    console.error("Socket register error:", error);
  }
});
async function findOrCreateLocation(latitude, longitude,city="") {
  // 1. Try to find existing location
  let locale = await prisma.location.findFirst({
    where: { latitude, longitude },
  });

  // 2. If not found, try to create it
  if (!locale) {
    try {
      locale = await prisma.location.upsert({
        where:{
          location_coords:{
            latitude:latitude,
            longitude:longitude
          }
        },
       create:{ latitude, longitude,city },
       update:{ latitude, longitude,city },
      });
      console.log(locale)
    } catch (err) {
      // 3. Handle race condition (unique constraint)
      if (err.code === "P2002") {
        locale = await prisma.location.findFirst({
          where: { latitude, longitude },
        });
        if (!locale) {
          throw new Error(
            "Failed to fetch location after P2002 – this should never happen"
          );
        }
      } else {
        throw err;
      }
    }
  }

  return locale;
}
async function updateProfileWithRetry(profileId, localeId) {
  let retries = 2;

  while (retries--) {
    try {
      // Single-document update — no transaction needed
      const updatedProfile = await prisma.profile.update({
        where: { id: profileId },
        data: {
          isActive: true,
          ...(localeId ? { location: { connect: { id: localeId } } } : {}),
        },
        include: { location: true },
      });

      return updatedProfile;
    } catch (err) {
      // Retry only if it's a transaction abort (P2028)
      if (err.code === "P2028" && retries > 0) {
        console.log("Update aborted, retrying after delay...");
        await new Promise((res) => setTimeout(res, 100)); // short delay
        continue; // retry
      }
      // Throw other errors immediately
      throw err;
    }
  }
}

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