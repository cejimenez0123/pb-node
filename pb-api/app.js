var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var MongoClient = require("mongodb").MongoClient
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var cors = require('cors')
var passport = require("passport")
const LocalStrategy = require("passport-local")
var app = express();
var session = require("express-session")
var parse = require("./routes/parse")
const User = require("./models/user").User
// view engine setup
app.use(cors())
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.all('/', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  next()
});
app.use("/parse",parse)
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


//
app.use(session({
  secret: 'work hard',
  resave: true,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
 // This next line authenticates the user at login
passport.use(new LocalStrategy(User.authenticate()));;
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
//Routes

app.use('/', indexRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
