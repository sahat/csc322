// implement email, search, tel, url text fields HTML5 with client-side validation
// autofocus html5 on first field
var express = require('express');
var path = require('path');
var http = require('http');
var mongoose = require('mongoose');
var bcrypt = require('bcrypt')
var RedisStore = require('connect-redis')(express);
var moment = require('moment');
// add jquery credit card validator
//var crypto = require('crypto'); // for gravatar hashing

//var hash = crypto.createHash('md5').update('sakhat@gmail.com').digest('hex');


//console.log(hash);
var db = mongoose.connect('mongodb://localhost/test');

/*
  __  __                         ____  ____
 |  \/  | ___  _ __   __ _  ___ |  _ \| __ )
 | |\/| |/ _ \| '_ \ / _` |/ _ \| | | |  _ \
 | |  | | (_) | | | | (_| | (_) | |_| | |_) |
 |_|  |_|\___/|_| |_|\__, |\___/|____/|____/
                     |___/
 */
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

// middleware that hashes a password before it is saved to DB
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

User.methods.comparePassword = function(candidatePassword, callback) {
  bcrypt.compare(candidatePassword, this.password, function(err, isMatch) {
    if (err) {
      return callback(err);
    }
    callback(null, isMatch);
  });
};

var User = mongoose.model('User', User);

var app = express();

app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.locals.pretty = true;
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.cookieParser('s3cr3t'));
app.use(express.session({ secret: 's3cr3t' }));
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));
app.configure('development', function() {
  app.use(express.errorHandler());
});

// Routes and Controllers

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
  res.render('games', {
    heading: 'All Games',
    lead: 'Game titles listed in alphabetical order',
    user: req.session.user
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
  User.update({'email': req.session.user.email }, {
      //firstName: req.body.firstName,
      //lastName: req.body.lastName,
      //email: req.body.email,
      //password: req.body.password,
      ccnumber: req.body.expiration_date,
      expiration_date: req.body.expiration_date,
      cv2: req.body.cv2
  }, function () {

    User.findOne({ 'email': req.session.user.email }, function (err, user) {
      if (err) {
        return;
      }

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

