var express = require('express');
let app = express()
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.send("CONNECTED YAY!!")
  // res.render('index', { title: 'Express' });
});


module.exports = router;
