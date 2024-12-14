const express = require("express");
let session = require('cookie-session');
const bodyParser = require("body-parser")
const cors = require('cors')
const authRoutes = require("./routes/auth")
const storyRoutes = require("./routes/story")
const collectionRoutes = require("./routes/collection")
const profileRoutes = require("./routes/profile")
const commentRoutes = require("./routes/comment.js")
const passport = require("passport")
const {setUpPassportLocal}= require("./middleware/authMiddleware.js")
const app = express();
const PORT = process.env.PORT
app.use(cors())
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
app.use("/auth",authRoutes(authMiddleware))
app.use("/story",storyRoutes(authMiddleware))
app.use("/profile",profileRoutes(authMiddleware))
app.use("/collection",collectionRoutes(authMiddleware))
app.use("/comment",commentRoutes(authMiddleware))
setUpPassportLocal(passport);
app.use(
    session({
    secret: process.env.JWT_SECRET,resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
    }))
app.use(passport.session());
app.use(passport.initialize());
app.listen(PORT, () => {
console.log(`Server is running`+PORT)
})
module.exports = app