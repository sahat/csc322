var mongoose = require('mongoose');
var bcrypt = require('bcrypt');

/*
 __  __                         ____  ____
 |  \/  | ___  _ __   __ _  ___ |  _ \| __ )
 | |\/| |/ _ \| '_ \ / _` |/ _ \| | | |  _ \
 | |  | | (_) | | | | (_| | (_) | |_| | |_) |
 |_|  |_|\___/|_| |_|\__, |\___/|____/|____/
                     |___/
 */


// Establishes a connection with MongoDB database
// localhost is db-host and test is db-name
var db = mongoose.connect('mongodb://localhost/test');

// In Mongoose everything is derived from Schema.
// Here we create a schema called User with the following fields.
// Each field requires a type and optional additional properties, e.g. unique field? required field?
var User = new mongoose.Schema({
  userName: { type: String, required: true, index: { unique: true } },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  joined_on: { type: Date, default: Date.now() },
  purchasedGames: [{
    thumbnail: String,
    rating: { type: Number, default: 0 },
    date: { type: Date, default: Date.now() }
  }],
  ratedGames: [{
    title: String,
    slug: String,
    rating: Number,
    date: { type: Date, default: Date.now() }
  }],
  email: { type: String, required: true },
  password: { type: String, required: true },
  interests: [String],
  comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }],
  isAdmin: { type: Boolean, default: false },
  suspendedAccount: { type: Boolean, default: false },
  suspendedRating: { type: Boolean, default: false },
  warningCount: { type: Number, default: 0 },
  weightCoefficient: { type: Number, default: 1},
  flagCount: { type: Number, default: 0 },
  gamertag: String
});

// Comment schema
var Comment = new mongoose.Schema({
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  game : { type: mongoose.Schema.Types.ObjectId, ref: 'Game' },
  body : { type: String, required: true, trim: true },
  date: { type: Date, default: Date.now },
  flagged: { type: Boolean, default: false },
  hasBeenWarned: { type: Boolean, default: false }
});

// Here we create a schema called Game with the following fields.
var Game = new mongoose.Schema({
  title: String,
  publisher: String,
  thumbnail: String,
  largeImage: String,
  releaseDate: String,
  genre: String,
  summary: String,
  description: String,
  price: String,
  votedPeople: [String],
  slug: { type: String, index: { unique: true } },
  weightedScore: { type: Number, default: 0 },
  rating: { type: Number, default: 0 },
  votes: { type: Number, default: 0 },
  purchaseCounter: { type: Number, default: 0 }
});

// Express middleware that hashes a password before it is saved to database
// The following function is invoked right when we called MongoDB save() method
// We can define middleware once and it will work everywhere that we use save() to save data to MongoDB
// The purpose of this middleware is to hash the password before saving to database, because
// we don't want to save password as plain text for security reasons
User.pre('save', function (next) {
  var user = this;

  // only hash the password if it has been modified (or is new)
  if (!user.isModified('password')) {
    return next();
  }

  // generate a salt with 10 rounds
  bcrypt.genSalt(10, function(err, salt) {
    if (err) {
      return next(err);
    }

    // hash the password along with our new salt
    bcrypt.hash(user.password, salt, function(err, hash) {
      if (err) {
        return next(err);
      }

      // override the cleartext password with the hashed one
      user.password = hash;
      next();
    });
  });
});

// This middleware compares user's typed-in password during login with the password stored in database
User.methods.comparePassword = function(candidatePassword, callback) {
  bcrypt.compare(candidatePassword, this.password, function(err, isMatch) {
    if (err) {
      return callback(err);
    }
    callback(null, isMatch);
  });
};

// After we create a schema, the next step is to create a model based on that schema.
// A model is a class with which we construct documents.
// In this case, each document will be a user with properties and behaviors as declared in our schema.

exports.User = mongoose.model('User', User);
exports.Game = mongoose.model('Game', Game);
exports.Comment = mongoose.model('Comment', Comment);