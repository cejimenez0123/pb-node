var express = require('express');
var router = express.Router();
var MongoClient = require("mongodb").MongoClient
var Server = require('mongodb').Server;
var mongoose = require("mongoose")
var path = require("path")
var mongoose = require('mongoose')
let DbUrl = "mongodb://localhost:27017/pb"
let User = require("../models/user")

 

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
 console.log("Req",req)
  console.log(req.body)

  let user = new User({...req.body})
   db.collection("user").save(user).then(obj=>obj.json().then(obj=>{console.log(obj)}))
 res.json(user)


})
router.get('/login',(req,res)=>{
  const {username,password} = req.body
  User.authenticate(username,password,function(err,result){
    if (err) console.log(err)
    res.json(result)

  })
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
