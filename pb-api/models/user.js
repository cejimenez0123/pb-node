let mongoose = require("mongoose")
let Schema = mongoose.Schema

const UserSchema = new Schema({
    username: String,
    name: String,
    password: String,
    createdAt:{type: Date, default: Date.now}
})



  module.exports = mongoose.model("User",UserSchema)
