const express = require("express");
let session = require('cookie-session');
const bodyParser = require("body-parser")
const cors = require('cors')
const authRoutes = require("./routes/auth")
const storyRoutes = require("./routes/story")
const collectionRoutes = require("./routes/collection")
const profileRoutes = require("./routes/profile")
const app = express();
const PORT = process.env.PORT || 3000;
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

app.use("/auth",authRoutes())
app.use("/story",storyRoutes())
app.use("/profile",profileRoutes())
app.use("/collection",collectionRoutes())
app.use(
    session({
    secret: process.env.JWT_SECRET??"SDFSDGds",resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
    }))
app.listen(PORT, () => {
console.log(`Server is running on port `+PORT)
})
module.exports = app