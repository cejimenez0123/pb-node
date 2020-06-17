var express = require('express');
let app = express()
var router = express.Router();
var cors = require('cors')
/* GET home page. */

router.get('/',function(req, res, next) {
  res.send("CONNECTED YAY!!")
  // res.render('index', { title: 'Express' });
  res.end()
});


module.exports = router;
