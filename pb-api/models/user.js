let mongoose = require("mongoose")
let Schema = mongoose.Schema
const UserSchema = new Schema({
    username: String,
    name: String,
    password: String,
    createdAt:{type: Date, default: Date.now}
})
module.exports = mongoose.model("User",UserSchema)

UserSchema.statics.authenticate = function (email, password, callback) {
    User.findOne({ email: email })
      .exec(function (err, user) {
        if (err) {
          return callback(err)
        } else if (!user) {
          var err = new Error('User not found.');
          err.status = 401;
          return callback(err);
        }
        bcrypt.compare(password, user.password, function (err, result) {
          if (result === true) {
            return callback(null, user);
          } else {
            return callback();
          }
        })
      });
  }