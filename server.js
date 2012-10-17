//??? TODO: After registered user log-ins, redirect to main page and display 3 games based on interests criteria and 3 based on previous purchases
//??? TODO: If the user hasn't purchased anything display 6 items based on interest criteria

// TODO: Per session, keep track how many times user voted, and the average rating of the votes
// TODO: IF voteCount >= 5 and avg_rating <= 1, increment flag by 1
// TODO: If flag == 3, suspend user for that session. Can't rate anymore (jRaty read-only flag).
// TODO: If flag >= 1, rating weight is low

// TODO: Recommend to a user, based on user's past ratings. Don't recommend low-rated games, recommend high-rated games
// TODO: Recommend based on interests during the registration
// TODO: Recommend based on other users with similar interests

// TODO: Creative feature: Video reviews from IGN? Latest stories about the game from Gamespot?

// TODO: convert add_game to a page with URL input field and submit button

// TODO: Users and visitors can submit complaint about inappropriate comment
// TODO: Create a page where admin can process these inappropriate comments: Ignore or (Erase & Send warning to user)
// TODO: Spammers who were warned/suspected twice will be given 1 last chance to clean up their bad comments
// TODO: Users can remove their own comments
// TODO: After 24 hours, user will be removed from the system


var fs = require('fs');
var express = require('express');
var path = require('path');
var http = require('http');
var mongoose = require('mongoose');
var bcrypt = require('bcrypt');
var RedisStore = require('connect-redis')(express);
var moment = require('moment');
var jsdom = require('jsdom');
var request = require('request');
var io = require('socket.io');
var _ = require('underscore');
var email = require('emailjs');

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
  purchasedGames: [{
    title: String,
    slug: String,
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
  password: String,
  interests: [String],
  comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }],
  isAdmin: { type: Boolean, default: false }
});

// Comment schema
var Comment = new mongoose.Schema({
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  game: { type: mongoose.Schema.Types.ObjectId, ref: 'Game' },
  likes: { count: { type: Number }, user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } },
  body: {type: String, required: true },
  date: {type: Date, default: Date.now },
  flagged: { type: Boolean, default: false }
});

// Here we create a schema called Game with the following fields.
var Game = new mongoose.Schema({
  slug: String,
  title: String,
  publisher: String,
  thumbnail: String,
  largeImage: String,
  releaseDate: String,
  genre: String,
  weightedScore: Number,
  rating: Number,
  votes: Number,
  votedPeople: [String],
  summary: String,
  description: String,
  price: String
});

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
var Comment = mongoose.model('Comment', Comment);

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

app.get('/add', function (req, res) {
  res.render('add');
});

app.post('/add', function (req, res) {
  //var url = 'http://www.amazon.com/gp/product/B00006IR62/ref=s9_simh_gw_p63_d0_i3?pf_rd_m=ATVPDKIKX0DER&pf_rd_s=center-2&pf_rd_r=0SV5QGZXE9458998V6X5&pf_rd_t=101&pf_rd_p=1389517282&pf_rd_i=507846';
  //var url = 'http://www.amazon.com/gp/product/B0050SYLRK/ref=vg_xbox_4pack_assassinsiii?pf_rd_m=ATVPDKIKX0DER&pf_rd_s=merchandised-search-3&pf_rd_r=4B4606133BD9433F8DFC&pf_rd_t=101&pf_rd_p=1404381382&pf_rd_i=14220161'
  //var url = 'http://www.amazon.com/Mass-Effect-3-Xbox-360/dp/B004FYEZMQ/ref=sr_1_1?ie=UTF8&qid=1349677230&sr=8-1&keywords=mass+effect+3';
  //var url = 'http://www.amazon.com/Borderlands-2-Xbox-360/dp/B0050SYK44/ref=sr_1_1?s=videogames&ie=UTF8&qid=1349677265&sr=1-1&keywords=borderlands+2';
  //var url = 'http://www.amazon.com/Star-Wars-The-Old-Republic-Pc/dp/B001CWXAP2/ref=sr_1_1?ie=UTF8&qid=1349849268&sr=8-1&keywords=star+wars+the+old+republic';
  //var url = 'http://www.amazon.com/Star-Wars-The-Force-Unleashed-Pc/dp/B002LHSGSI/ref=acc_glance_vg_ai_ps_t_2'
  //var url = 'http://www.amazon.com/Prototype-2-Xbox-360/dp/B004FUL9YW/ref=sr_1_1?s=videogames&ie=UTF8&qid=1349849413&sr=1-1&keywords=prototype+2'
  //var url = 'http://www.amazon.com/Guild-Wars-2-Pc/dp/B001TOQ8X4/ref=sr_tr_1?ie=UTF8&qid=1350276922&sr=8-1&keywords=guild+wars+2';
  var url = req.body.gameURL;
  request({uri: url}, function (err, response, body) {
    if (err && response.statusCode !== 200) return;
    jsdom.env({ html: body, scripts: ['http://code.jquery.com/jquery-1.6.min.js'] }, function (err, window) {
      var $ = window.jQuery;

      // title
      var title = $('#btAsinTitle').html();
      console.log($('#btAsinTitle').html());

      // price
      var price = $('#listPriceValue').html();
      console.log($('#listPriceValue').html());

      function slugify(text) {
        text = text.replace(/[^-a-zA-Z0-9,&\s]+/ig, '');
        text = text.replace(/-/gi, "_");
        text = text.replace(/\s/gi, "-");
        text = text.toLowerCase();
        return text;
      }

      // slug
      var slug = slugify(title);
      console.log(slugify(title));

      // long game summary with screenshots
      var summary = $('.productDescriptionWrapper .aplus').html();

      request({uri: 'http://www.gamespot.com/' + slug + '/platform/pc/'}, function (err, response, body) {
        if (err && response.statusCode !== 200) return;
        jsdom.env({ html: body, scripts: ['http://code.jquery.com/jquery-1.6.min.js'] }, function (err, window) {
          var $ = window.jQuery;

          // game description
          var description = $('.productDeck .mainDeck').text();
          console.log(description);

          // genre
          var genre = $('.genre .data').text();
          console.log(genre);

          // game publisher
          var publisher = $('.publisher .data').text();
          console.log(publisher);

          // release date
          var temp = $('.date .data').text();
          var releaseDate = temp.replace('  (US) »', '');
          console.log(releaseDate);
          console.log(Date.parse(releaseDate));

          // thumbnail image
          var thumbnail = $('.boxshot a img').attr('src');
          request(thumbnail).pipe(fs.createWriteStream('./public/img/small/' + thumbnail));
          console.log(thumbnail);

          // large cover for the game
          // I used a regular expression 'replace' to replace thumb with front to match valid Gamespot URL
          var tempLarge = $('.boxshot a img').attr('src');
          var largeImage = tempLarge.replace('thumb', 'front');
          request(largeImage).pipe(fs.createWriteStream('./public/img/large/' + largeImage));
          console.log(largeImage);

          // save all above data to MongoDB
          var game = new Game({
            title: title,
            slug: slug,
            publisher: publisher,
            thumbnail: thumbnail,
            largeImage: largeImage,
            genre: genre,
            price: price,
            summary: summary,
            description: description,
            releaseDate: releaseDate,
            rating: 0,
            votes: 0
          });

          game.save(function(err) {
            if (err) return;
            console.log('saved game into db');
            res.redirect('/add');
          });
        });
      });
    });
  });
});

app.get('/', function(req, res) {
  if (req.session.tempPassword || req.session.user && req.session.user.interests.length < 3) {
    return res.redirect('/account');
  }
  if (req.session.user) {
    Game
      .find()
      .where('genre').in(req.session.user.interests)
      .limit(6)
      .sort('-weightedScore')
      .exec(function (err, games) {
        if (err) throw err;
        res.render('index', {
          heading: 'N7 Online Store',
          lead: 'The leading next generation video games recommendation engine',
          user: req.session.user,
          customgames: games
        });
      });
  } else {
    Game
      .find()
      .limit(3)
      .sort('-weightedScore')
      .exec(function(err, game) {
        if (err) throw err;
        res.render('index', {
          heading: 'N7 Online Store',
          lead: 'The leading next generation video games recommendation engine',
          user: req.session.user,
          games: game
        });
      });
  }
});


app.post('/buy', function (req, res) {
  User.findOne({ 'userName': req.session.user.userName }, function (err, user) {
    Game.findOne({ 'slug': req.body.slug }, function (err, game) {
      var rating = 0;
      for (var i = 0; i < user.ratedGames.length; i++) {
        if (game.slug == user.ratedGames[i].slug) {
          console.log("I have already voted on this game");
          var rating = user.ratedGames[i].rating;
        }
      }
      user.purchasedGames.push({ title: game.title, slug: game.slug, rating: rating });
      req.session.user = user;
      user.save(function (err) {
        console.log('Purchased game added to the list');
        var server = email.server.connect({
          user:    "username",
          password:"password",
          host:    "smtp.gmail.com",
          ssl:     true
        });
        server.send({
          text: 'Thank you for purchasing ' + game.title + '. Your game will be shipped within 2 to 3 business days.',
          from: 'Sahat Yalkabov <sakhat@gmail.com>',
          to: user.firstName + ' ' + user.lastName + ' <' + user.email + '>',
          subject: 'Order Confirmation'
        }, function(err, message) {
          console.log(err || message);
        });
      });
    });
  });
  res.redirect('/games');
});


app.post('/games/rating', function (req, res) {;
  Game.update({ 'slug': req.body.slug }, { $inc: { rating: req.body.rating, votes: 1 } }, function (err, game) {
    if (err) throw err;
    console.log('updated rating!')
  });
  Game.findOne({ 'slug': req.body.slug }, function (err, game) {
    game.weightedScore = game.rating + req.body.rating * 1.5;
    game.votedPeople.push(req.session.user.userName);
    game.save(function (err) {
      if (err) throw err;
      console.log('successfully set average rating');
    });
    User.findOne({ 'userName': req.session.user.userName }, function (err, user) {
      // if the user purchased the game, update rating in there as well
      for (var i=0; i<user.purchasedGames.length; i++) {
        if (user.purchasedGames[i].slug == req.body.slug) {
          user.purchasedGames[i].rating = req.body.rating;
        }
      }
      user.ratedGames.push({ title: game.title, slug: game.slug, rating: req.body.rating });
      user.save();
    });
  });
  return res.redirect('/games');
});


app.get('/games/api', function (req, res) {
  Game
    .find()
    .select('_id title')
    .exec(function (err, games) {
      res.send(games);
    });
});


app.get('/games', function (req, res) {
  if (req.session.tempPassword || req.session.user && req.session.user.interests.length < 3) {
    return res.redirect('/account');
  }
  Game.find(function (err, games) {
    if (!req.session.user) {
      return res.render('games', {
        heading: 'All Games',
        lead: 'Game titles listed in alphabetical order',
        games: games
      });
    }
    User.findOne({ 'userName': req.session.user.userName }, function (err, user) {
      res.render('games', {
        heading: 'All Games',
        lead: 'Game titles listed in alphabetical order',
        user: user,
        games: games
      });
    });
  });
});

app.get('/games/:detail', function (req, res) {
  if (req.session.tempPassword || req.session.user.interests.length < 3) {
    return res.redirect('/account');
  }
  Game.findOne({ 'slug': req.params.detail }, function (err, game) {
    Comment
      .find({ game: game._id })
      .populate('creator')
      .exec(function (err, comments) {
        res.render('detail', {
          heading: game.title,
          lead: game.publisher,
          game: game,
          comments: comments,
          user: req.session.user
        });
      });
  });
});


app.post('/games/:detail', function (req, res) {
  console.log(req.body.comment);

  // move into comment/add method
  User.findOne({ userName: req.session.user.userName }, function (err, user) {
    Game.findOne({ slug: req.params.detail }, function (err, game) {
      var comment = new Comment({
        creator: user._id,
        game: game._id,
        body: req.body.comment
      });
      comment.save(function () {
        console.log('Saved comment to database');
      });
      res.redirect('/games/' + req.params.detail);
    });
  });
});


app.post('/comment/delete', function (req, res) {
  Comment.remove({ _id: req.body.commentId }, function (err) {
    if (err) throw err;
    console.log('comment has been removed');
  });
});


app.post('/comment/report', function (req, res) {
  Comment.findOne({ '_id': req.body.comment_id }, function (req, comment) {
    console.log(comment);
    comment.flagged = true;
    comment.save(function (err) {
      console.log('Comment has been reported');
    });
  });
});


app.get('/admin', function (req, res) {
  User.find(function (err, users) {
    if (err) throw err;
    console.log(users);

    Comment
      .find({ 'flagged': true })
      .populate('game')
      .exec(function (err, comments) {
        res.render('admin', {
          heading: 'Admin Dashboard',
          lead: 'Manage users, system analytics..',
          user: req.session.user,
          users: users,
          flaggedComments: comments
        });
      });

  });
});


app.get('/account', function (req, res) {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  console.log(req.session.user.purchasedGames);
  User.findOne({ userName: req.session.user.userName }, function (err, user) {
    Game.find(function (err, games) {
      var tagArray = [];
      _.each(games, function (game) {
        tagArray.push(game.title)
      });
      req.session.user = user;
      console.log(user.purchasedGames);
      res.render('profile', {
        heading: 'Profile',
        lead: 'View purchase history, update account, choose interests',
        user: req.session.user,
        tags: tagArray,
        tempPassword: req.session.tempPassword
      });
    });
  });
});


app.post('/account', function (req, res) {
  User.findOne({ 'userName': req.session.user.userName }, function (err, user) {
    user.firstName = req.body.firstName;
    user.lastName = req.body.lastName;
    user.password = (!req.body.newpassword) ? req.session.user.password : req.body.newpassword;
    if (req.body.newpassword) {
      user.password = req.body.newpassword;
      delete req.session.tempPassword;
    }
    user.save(function(err) {
      req.session.user = user;
      res.redirect('/account')
    });
  });
});


app.post('/account/tag/add', function (req, res) {
  User.findOne({ 'userName': req.session.user.userName }, function (err, user) {
    _.each(req.body.tags, function (tag) {
      user.interests.push(tag);
    });
    var flatArray = _.flatten(user.interests);
    var uniqueArray = _.uniq(flatArray);
    user.interests = uniqueArray;
    user.save(function (err) {
      console.log('Saved ' + uniqueArray);
    });

  });
});


app.post('/account/tag/delete', function (req, res) {
  User.findOne({ 'userName': req.session.user.userName }, function (err, user) {
    var index = user.interests.indexOf(req.body.removedTag);
    user.interests.splice(index, 1);
    user.save(function (err) {
      console.log('Saved!');
    });
    console.log('Removed ' + req.body.removedTag + ' from interests.');
  });
});


app.get('/logout', function(req, res) {
  req.session.destroy(function (){
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
    user: req.session.user,
    incorrectLogin: req.session.incorrectLogin,
    message: { success: req.session.message },
  });
});

app.post('/login', function (req, res) {
  User.findOne({ 'userName': req.body.userName }, function (err, user) {
    if (!user) {
      req.session.incorrectLogin = true;
      res.redirect('/login');
    } else {
      user.comparePassword(req.body.password, function(err, isMatch) {
        // correct login
        if (isMatch) {
          delete req.session.incorrectLogin;
          req.session.user = user;

          // create session to keep track of votes
          req.session.voteCount = 0;
          req.session.avgRating = 0;

          res.redirect('/');
          // incorrect login
        } else {
          req.session.incorrectLogin = true;
          res.redirect('/login');
        }
      });
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
  var firstLetterOfFirstName = req.body.firstName[0].toLowerCase();
  var lastName = req.body.lastName.toLowerCase();
  var randomNumber = Math.floor(Math.random() * 1000);
  var userName = firstLetterOfFirstName + lastName + randomNumber;
  var newUser = new User({
    userName: userName,
    password: userName,
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    email: req.body.userEmail
  });
  User.findOne({'isAdmin': true }, function (err, user) {
    if (!user) {
      console.log('no users that are admin');
      newUser.isAdmin = true;
    } else {
      console.log('admin already exists');
      newUser.isAdmin = false;
    }
  });
  newUser.save(function (err) {
    if (err) {
      res.send(500, 'Halt: Duplicate Username Detected');
    } else {
      req.session.user = newUser;
      req.session.tempPassword = true;
      res.redirect('/account');
    }
  });
});


var server = http.createServer(app).listen(app.get('port'), function() {
  console.log('Express server listening on port ' + app.get('port'));
});
