const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const passportLocalMongoose = require('passport-local-mongoose');
const Campground = require('./campground')
const Review = require('./review')

const UserSchema = new Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    stripe_account: String,
    cities: Array,
    phone: String,
    website: String,
    name: String,
    campgrounds: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Campground'
        }
    ],
    reviews: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Review'
        }
    ]
});

UserSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model('User', UserSchema);