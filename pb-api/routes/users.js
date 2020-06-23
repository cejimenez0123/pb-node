var express = require('express');
var router = express.Router();
var MongoClient = require("mongodb").MongoClient
var Server = require('mongodb').Server;
var mongoose = require("mongoose")
var path = require("path")
var passport = require("passport")
let DbUrl = "mongodb://localhost:27017/pb"
let middleware = require("../middleware/index")
const User = require("../models/user").User

 

let db
MongoClient.connect("mongodb://localhost:27017/pb", { useUnifiedTopology: true },function(err, pbdb) {
  db = pbdb 
  console.log(pbdb)
  if (err) console.log(err)
  if(!err) {
    console.log("We are connected");
  }
  console.log("Db",db.collection("user").find({}).toArray((err,result)=>{
    if (err) console.log(err)
    console.log("result",result)
  }))
  db.collection('user', {strict:true}, function(err, collection) {});
});

router.get('/',(req,res)=>{
  db.collection("user").find({}).toArray((err,result)=>{
    if (err) console.log(err)
    res.send(result)})

})
router.post('/',(req,res)=>{
  console.log(req.body)
  const newUser = new User ({username: req.body.username,name: req.body.name});
  console.log("new",newUser)
  User.register(newUser, req.body.password, function(err, user) {
    if(err) {
			console.log(err);
     res.json(user);
      
    }		
  
		  passport.authenticate("local",{failureRedirect: "/"})(req, res, function() {

        
    
  })
  User.register()
  
  })
})
  
  // app.post("/register", function(req, res) {
  //   // The logic here comes from passport in user.js
  //   const newUser = new User({username: req.body.username});
  //   User.register(newUser, req.body.password, function(err, user) {
  //     if(err) {
  //       console.log(err);
  //       return res.render("register");
  //     }
  //     passport.authenticate("local")(req, res, function() {
  //       res.redirect("/q&a")
  //     })
  
  //   })
  //   User.register()
  // })
// 	User.register()
//   console.log(req.body)
//   let user = new User({...req.body})
//   req.session.userId = user.id
//    db.collection("user").save(user).then(obj=>console.log(obj)).catch(err=>console.log(err))
  
// res.json(user)



router.post('/login', passport.authenticate('local'),(req,res)=>{
  res.redirect(`http://localhost:3000/users/${res.user.username}`)
})
router.get('/logout', function(req, res, next) {
  if (req.session) {
    // delete session object
    req.session.destroy(function(err) {
      if(err) {
        return next(err);
      } else {
        return res.redirect('/');
      }
    });
  }
});

  

module.exports = router;
