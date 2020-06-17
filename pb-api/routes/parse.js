var express = require('express');
var router = express.Router();

// the URL pattern will be used in conjunction with how its is being used
// in this case it would be '/parse' (from app.js) + '/parse' (as used in the next line)
// resulting in '/parse/parse' 
router.get('/parse', function(req, res, next) {
  res.send('return from parse.js');
});

module.exports = router;