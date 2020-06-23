
const mongoose = require("mongoose")
const Schema = mongoose.Schema
const passportLocalMongoose = require("passport-local-mongoose")
const UserSchema = new Schema({
    username: String,
    name: String,
    password: String,
    createdAt:{type: Date, default: Date.now}
})


UserSchema.plugin(passportLocalMongoose)
const User = mongoose.model("User",UserSchema)

module.exports ={ User: User}