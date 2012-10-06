/*
  ___                            _
 |_ _|_ __ ___  _ __   ___  _ __| |_
  | || '_ ` _ \| '_ \ / _ \| '__| __|
  | || | | | | | |_) | (_) | |  | |_
 |___|_| |_| |_| .__/ \___/|_|   \__|
               |_|
 */
var express = require('express');
var path = require('path');
var http = require('http');
var mongoose = require('mongoose');
var bcrypt = require('bcrypt')
var RedisStore = require('connect-redis')(express);
var moment = require('moment');

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

  firstName: {
    type: String,
    required: true
  },

  lastName: {
    type: String,
    required: true
  },

  location: {
    type: String
  },

  purchaseHistory: {
    type: Array
  },

  ratedGames: {
    type: Array
  },

  email: {
    type: String,
    required: true,
    index: {
      unique: true
    }
  },

  password: {
    type: String,
    required: true
  },

  ccnumber: {
    type: String
  },

  cv2: {
    type: String
  },

  expiration_date: {
    type: String
  }

});

// Here we create a schema called Game with the following fields.
var Game = new mongoose.Schema({

  slug: {
    type: String
  },

  title: {
    type: String
  },

  releaseDate: {
    type: String
  },

  // change to array, use genre as 'tags', e.g. ['action', 'rpg'] instead of Action RPG
  genre: {
    type: String
  },

  rating: {
    type: Number
  },

  summary: {
    type: String
  },

  recommendedGames: {
    type: Array
  },

  price: {
    type: String
  }

});
//  comments: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, body: String, date: Date }],

// Express middleware that hashes a password before it is saved to database
// The following function is invoked right when we called MongoDB save() method
// We can define middleware once and it will work everywhere that we use save() to save data to MongoDB
// The purpose of this middleware is to hash the password before saving to database, because
// we don't want to save password as plain text for security reasons
User.pre('save', function(next) {
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

var User = mongoose.model('User', User);
var Game = mongoose.model('Game', Game);

/*
  ____       _   _   _
 / ___|  ___| |_| |_(_)_ __   __ _ ___
 \___ \ / _ \ __| __| | '_ \ / _` / __|
  ___) |  __/ |_| |_| | | | | (_| \__ \
 |____/ \___|\__|\__|_|_| |_|\__, |___/
                             |___/
 */

var app = express();

app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.locals.pretty = true;
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.cookieParser('s3cr3t'));
app.use(express.session({ store: new RedisStore, secret: 's3cr3t' }));
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));
app.configure('development', function() {
  app.use(express.errorHandler());
});

/*
  ____             _
 |  _ \ ___  _   _| |_ ___  ___
 | |_) / _ \| | | | __/ _ \/ __|
 |  _ < (_) | |_| | ||  __/\__ \
 |_| \_\___/ \__,_|\__\___||___/
 */

app.get('/addgame', function (req, res) {

  var game = new Game({
    slug: 'guildwars2',
    title: 'Guild Wars 2',
    releaseDate: 'Aug 28, 2012',
    genre: 'Online Role-Playing',
    summary: 'Guild Wars 2 is a fantasy massively multiplayer online role-playing game and is the sequel to the episodic Guild Wars game series.',
    rating: 4.0,
    price: '49.99'

  });

  game.save(function(err) {        // Save the model instance to database
    if (!err) {
      res.send('game saved!')
    }
  });
  /*

  var game = new Game({
    slug: 'borderlands_2',
    title: 'Borderlands 2',
    releaseDate: 'Sep. 18, 2012',
    genre: 'Sci-Fi First-Person Shooter',
    summary: 'Borderlands 2 continues in its predecessors footsteps with four new characters, tons of new quests, and lots of shooting and looting.',
    rating: 6.5,
    price: '59.99'

  });

  game.save(function(err) {        // Save the model instance to database
    if (!err) {
      res.send('game saved!')
    }
  });

  */
});

app.get('/', function(req, res) {
  res.render('index', {
    heading: 'N7 Online Store',
    lead: 'The leading next generation video games recommendation engine',
    user: req.session.user
  });
});

app.post('/buy', function (req, res) {
  console.log(req.body.title);
  return res.redirect('/');
});

app.get('/games', function (req, res) {

  Game.find(function (err, games) {
    if (!err) {
      //console.log(games);
      for (var i=0; i<3; i++) {
        console.log(games[i]);
      }

      res.render('games', {
        heading: 'All Games',
        lead: 'Game titles listed in alphabetical order',
        user: req.session.user,
        gameid: 'b2',
        games: games,
        game: {
          summary: 'www',
          title: 'www',
          price: 1231,
          genre: 'www',
          releaseDate: 'www'
        }
      });
    }
  });


});

app.get('/games/:slug', function (req, res) {
  res.render('detail', {
    heading: 'Borderlands 2',
    lead: '2K Games',
    user: req.session.user
  });
  /*
  1. findOne using slug
  2. pass game's data to games/detail.jade
  3. render page
   */
});

app.get('/users', function (req, res) {
  if (req.session.user) {
    res.redirect('/users/' + req.session.user.email);
  } else {
    res.redirect('/');
  }
});

// :id refers to whatever user types after www.ourwebsite.com/users/<id>
// in our case, id = user's email address
app.post('/users/:id', function (req, res) {
  // Updates an instance of a user model in the database
  // First parameter is finding the user we want to update, in this case find based on user's email
  // Second parameter with $set specifies which fields we want to update
  // Last parameter is a callback function that will execute once MongoDB updates specified fields
  // Again we use a callback function because we don't know how long the update process will take
  // and is therefore has to be done asynchronously so we don't block the main execution thread
  //
  // I broke apart parameters over multiple lines because we are updating many fields and it wouldn't
  // fit in one line


  // So we don't overwrite the existing password with a blank password if a user leaves password fields blank
  if (!req.body.newpassword) {
    var password = req.session.user.password;
  }
  console.log("Newer password" + password);
  console.log(req.body.firstName);
  console.log(req.body.lastName);
  console.log(req.body.userEmail);
  console.log(req.body.ccnumber);
  console.log(req.body.expiration_date);
  console.log(req.body.cv2);
  console.log();
  User.update({'email': req.session.user.email }, {
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    email: req.body.userEmail,
    password: password,
    ccnumber: req.body.ccnumber,
    expiration_date: req.body.expiration_date,
    cv2: req.body.cv2
    }, function () {
        User.findOne({ 'email': req.session.user.email }, function (err, user) {
          if (err) return;

          req.session.user = user;


          res.render('profile', {
            heading: 'Profile',
            lead: 'View purchase history, update account...',
            user: req.session.user,
            message: req.session.message
          });
    });
  });
/*
  var user = User.findOne({ 'email': req.session.user.email }, function (err, user) {
    if (err) {
      return;
    }

    if (user) {
      user.update({           // Create a new Mongoose model instance
        user.firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.userEmail,     // Set email field to the email input
        password: req.body.password,   // Set password field to the password input
        ccnumber: req.body.ccnumber,
        cv2: req.body.cv2,
        expiration_date: req.body.expiration_date
      });
      */
      /*
      user.save(function(err) {        // Save the model instance to database
        if (!err) {
          res.redirect('/users/' + req.session.user.email);
        }
      });
      */
   // }
  //});
});

app.get('/users/:id', function (req, res) {
  if (req.session.user) {
    if (req.params.id !== req.session.user.email) {
      res.redirect('/');
    }

    User.findOne({ 'email': req.session.user.email }, function(err, user) {
      if (!err) {
        if (user) { // There's a user with a given email already
          console.log(user);
          res.render('profile', {
            heading: 'Profile',
            lead: 'View purchase history, update account...',
            user: req.session.user,
            message: req.session.message
          });
        }
      }
    });



    res.render('profile', {
      heading: 'Profile',
      lead: 'View purchase history, update account...',
      user: req.session.user,
      message: req.session.message
    });
  } else {
    res.redirect('/');
  }

});

app.get('/logout', function(req, res) {
  req.session.destroy(function(){
    res.redirect('/');
  });
});

app.get('/login', function(req, res) {
  if (req.session.user) {
    res.redirect('/');
  }
  res.render('login', {
    heading: 'Sign In',
    lead: 'Use the login form if you are an existing user',
    registrationSuccessful: false,
    userNotFound: false,
    incorrectPassword: false,
    user: req.session.user,
    message: req.session.message
  });
});

app.post('/login', function (req, res) {
  var user = User.findOne({ 'email': req.body.userEmail }, function (err, user) {

    if (!user) {
      req.session.message = '<div class="alert alert-error fade in">' +
        '<strong>Oops. </strong>' + 'No Such user in the database.' + '</div>';
      res.redirect('/login');
    } else {
        console.log(user.password);
        console.log(req.body.password);
        user.comparePassword(req.body.password, function(err, isMatch) {
          if (err) {
            throw err;
          }
          if (isMatch) {
            req.session.user = user;
            res.redirect('/');
          } else {
            req.session.message = '<div class="alert alert-error fade in">' +
              '<strong>Sorry. </strong>' + 'The password is incorrect.' + '</div>';
            console.log('invalid password')
            res.redirect('/login');
          }

          console.log(req.body.password, isMatch); // -> Password123: true
        });
      /*
        if (req.body.password == user.password) {
          req.session.user = user;
          res.redirect('/');
        }	else {
            req.session.message = '<div class="alert alert-error fade in">' +
            '<strong>Sorry. </strong>' + 'The password is incorrect.' + '</div>';
            console.log('invalid password')
            res.redirect('/login');
          }
          */
    }
  });
});

app.get('/register', function(req, res) {
  if (req.session.user) {
    res.redirect('/');
  }

  res.render('register', {
    heading: 'Create Account',
    lead: 'Register with us to get your own personalized profile',
    message: req.session.message
  });
});

app.post('/register', function(req, res) {
  // Query the database to see if email is available
  var user = User.findOne({ 'email': req.body.userEmail }, function(err, user) {
    if (!err) {
      if (user) { // There's a user with a given email already
        req.session.message = '<div class="alert alert-error fade in">' +
          '<strong>Oh snap. </strong>' + 'Email address is not available.' + '</div>';
        res.render('register', { // Re-render the same page but with emailIsUnavalable set to true
          heading: 'Create Account',
          lead: 'Register with us to get your own personalized profile',
          message: req.session.message
        });
      }
    }
  });

  user = new User({           // Create a new Mongoose model instance
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    email: req.body.userEmail,     // Set email field to the email input
    password: req.body.password    // Set password field to the password input
  });

  user.save(function(err) {        // Save the model instance to database
    if (!err) {
      req.session.message = '<div class="alert alert-success fade in">' +
        '<strong>Congratulations, ' + req.body.firstName + '! ' + '</strong>' + 'Registration has been successful.' + '</div>';
// If nothing went wrong save has been successful
      res.redirect('/login');
    }
  });
});

var server = http.createServer(app).listen(app.get('port'), function() {
  console.log('Express server listening on port ' + app.get('port'));
});

// TODO: Implement email, search, tel, url text fields HTML5 with client-side validation autofocus html5 on first field

