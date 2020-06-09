var express = require('express');
var router = express.Router();
var path = require("path")
/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

router.post('/users',(req,res)=>{
  console.log(req.statusCode)
  debugger
  
})
module.exports = router;
