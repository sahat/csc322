var express = require('express');
var path = require('path');
var http = require('http');
var mongoose = require('mongoose');
var bcrypt = require('bcrypt')
var RedisStore = require('connect-redis')(express);
var socket = require('socket.io')
var moment = require('moment');

var db = mongoose.connect('mongodb://localhost/test');

var UserSchema = new mongoose.Schema({
  firstName: { type: String, required: true},
  lastName: { type: String, required: true },
  location: { type: String },
  purchaseHistory: { type: Array },
  ratedGames: { type: Array },
  email: { type: String, required: true, index: { unique: true } },
  password: { type: String, required: true }
});

var UserModel = mongoose.model('User', UserSchema);

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



app.get('/', function(req, res) {
  res.render('index', {
    heading: 'N7 Online Store',
    lead: 'The leading next generation video games recommendation engine',
    user: req.session.user
  });
});

app.get('/games', function (req, res) {
  res.render('games', {
    heading: 'All Games',
    lead: 'Game titles listed in alphabetical order',
    user: req.session.user
  });
});

app.get('/users', function (req, res) {
  if (req.session.user) {
    res.redirect('/users/' + req.session.user.email);
  } else {
    res.redirect('/');
  }
});

app.get('/users/:id', function (req, res) {
  if (req.session.user) {
    if (req.params.id !== req.session.user.email) {
      res.redirect('/');
    }
    res.render('profile', {
      heading: 'Profile',
      lead: 'View purchase history, update account...',
      user: req.session.user
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
  var user = UserModel.findOne({ 'email': req.body.userEmail }, function (err, user) {
    if (!user) {
      req.session.message = '<div class="alert alert-error fade in">' +
        '<strong>Oops. </strong>' + 'No Such user in the database.' + '</div>';
      res.redirect('/login');
    } else {
        console.log(user.password);
        console.log(req.body.password);
        if (req.body.password == user.password) {
          req.session.user = user;
          res.redirect('/');
        }	else {
            req.session.message = '<div class="alert alert-error fade in">' +
            '<strong>Sorry. </strong>' + 'The password is incorrect.' + '</div>';
            console.log('invalid password')
            res.redirect('/login');
          }
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
  var user = UserModel.findOne({ 'email': req.body.userEmail }, function(err, user) {
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
  user = new UserModel({           // Create a new Mongoose model instance
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    email: req.body.userEmail,     // Set email field to the email input
    password: req.body.password    // Set password field to the password input
  });
  user.save(function(err) {        // Save the model instance to database
    if (!err) {
      req.session.message = '<div class="alert alert-success fade in">' +
        '<strong>Congratulations, ' + req.body.firstName + '!' + '</strong>' + 'Registration has been successful.' + '</div>';
// If nothing went wrong save has been successful
      res.redirect('/login');
    }
  });
});

var server = http.createServer(app).listen(app.get('port'), function() {
  console.log('Express server listening on port ' + app.get('port'));
});

/*
 var io = socket.listen(server);
 io.sockets.on('connection', function (socket) {
 socket.on('emailFocusOut', function (data) {
 var user = UserModel.findOne({ 'email': data.userEmail }, function(err, user) {
 if (!err) {
 if (user === null) {
 socket.emit('emailFocusOutResponse', 0);
 } else {
 socket.emit('emailFocusOutResponse', 1);
 }
 }
 });
 });
 });
 */