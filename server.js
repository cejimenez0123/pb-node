const express = require("express");
let session = require('cookie-session');
const bodyParser = require("body-parser")
const cors = require('cors')
const http = require("http")
const roleRoutes = require("./routes/role.js")
const authRoutes = require("./routes/auth")
const storyRoutes = require("./routes/story")
const collectionRoutes = require("./routes/collection")
const profileRoutes = require("./routes/profile")
const likeRoutes = require("./routes/like.js")
const historyRoutes = require("./routes/history.js")
const commentRoutes = require("./routes/comment.js")
const workshopRoutes = require("./routes/workshop.js")
const passport = require("passport")
const hashtagRoutes = require("./routes/hashtag.js")
const {setUpPassportLocal}= require("./middleware/authMiddleware.js")
const { Server } = require('socket.io');

const activeUsers = new Map()
const app = express();
const PORT = process.env.PORT
app.use(cors({origin: true, credentials: true}))
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
const authMiddleware = passport.authenticate('bearer', { session: false });
app.use("/history",historyRoutes(authMiddleware))
app.use("/like",likeRoutes(authMiddleware))
app.use("/hashtag",hashtagRoutes(authMiddleware))
app.use("/role",roleRoutes(authMiddleware))
app.use("/auth",authRoutes(authMiddleware))
app.use("/story",storyRoutes(authMiddleware))
app.use("/profile",profileRoutes(authMiddleware))
app.use("/collection",collectionRoutes(authMiddleware))
app.use("/comment",commentRoutes(authMiddleware))
app.use("/workshop",workshopRoutes(authMiddleware))

setUpPassportLocal(passport);
app.use(
    session({
    secret: process.env.JWT_SECRET,resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
    }))
app.use(passport.session());
app.use(passport.initialize());
    
const server = http.createServer(app);
app.listen(PORT, () => {
    console.log(`Server is running`+PORT)
    })
    
const io = new Server(server);
io.on('connection', (socket) => {
        console.log('A user connected:', socket.id);
      
        
        socket.on('register', ({ userId, location }) => {
          activeUsers.set(socket.id, { userId, location });
          console.log(`User ${userId} registered at ${location.latitude}, ${location.longitude}`);
        });
      
        // Handle user disconnection
        socket.on('disconnect', () => {
          const user = activeUsers.get(socket.id);
          if (user) {
            console.log(`User ${user.userId} disconnected`);
            activeUsers.delete(socket.id);
          }else{
            console.log("Error")
          }
        });
      });



module.exports = app