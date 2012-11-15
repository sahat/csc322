/**
 * CSC322 @ CCNY Team Project
 * @type {Software Engineering}
 * @date {12/12/2012}
 */
var bcrypt = require('bcrypt');
var email = require('emailjs');
var fs = require('fs');
var http = require('http');
var path = require('path');
var express = require('express');
var jsdom = require('jsdom');
var mongoose = require('mongoose');
var request = require('request');
var RedisStore = require('connect-redis')(express);
var sylvester = require('sylvester');
var _ = require('underscore');
_.str = require('underscore.string');
_.mixin(_.str.exports());

var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);

app.configure(function () {
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.set.pretty = true;
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.cookieParser('s3cr3t'));
  //app.use(express.session({ secret: 's3cr3t' }));
  app.use(express.session({ store: new RedisStore(), secret: 's3cr3t' }));
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function () {
  app.use(express.errorHandler());
});

/**
 * MongoDB Configuration
 */

// Establishes a connection with MongoDB database
// localhost is db-host and test is db-name
var db = mongoose.connect('mongodb://sahat:mongooska@ds037827.mongolab.com:37827/csc322');

// Here we create a schema called Game with the following fields.
var GameSchema = new mongoose.Schema({
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
  weightedRating: { type: Number, default: 0 },
  rating: { type: Number, default: 0 },
  votes: { type: Number, default: 0 },
  purchaseCounter: { type: Number, default: 0 }
});

// In Mongoose everything is derived from Schema.
// Here we create a schema called User with the following fields.
// Each field requires a type and optional additional properties, e.g. unique field? required field?
var UserSchema = new mongoose.Schema({
  userName: { type: String, required: true, index: { unique: true } },
  password: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true },
  joined_on: { type: Date, default: Date.now() },
  interests: [String],
  isAdmin: Boolean,
  gamertag: String,
  tempPassword: Boolean,
  suspendedRating: Boolean,
  suspendedAccount: Boolean,
  ratingPardon: Boolean,
  commentPardon: Boolean,
  ratingWeight: { type: Number, default: 1 },
  warningCount: { type: Number, default: 0 },
  ratingFlagCount: { type: Number, default: 0 },
  comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }],
  ratedGames: [{
    game: { type: mongoose.Schema.Types.ObjectId, ref: 'Game' },
    myRating: Number
  }],
  purchasedGames: [{
    game: { type: mongoose.Schema.Types.ObjectId, ref: 'Game' },
    date: { type: Date, default: Date.now() }
  }]
});

// Comment schema
var CommentSchema = new mongoose.Schema({
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  game : { type: mongoose.Schema.Types.ObjectId, ref: 'Game' },
  body : { type: String, required: true, trim: true },
  date: { type: Date, default: Date.now },
  flagged: { type: Boolean, default: false },
  hasBeenWarned: { type: Boolean, default: false }
});

// Express middleware that hashes a password before it is saved to database
// The following function is invoked right when we called MongoDB save() method
// We can define middleware once and it will work everywhere that we use save() to save data to MongoDB
// The purpose of this middleware is to hash the password before saving to database, because
// we don't want to save password as plain text for security reasons
UserSchema.pre('save', function (next) {
  var user = this;

  // only hash the password if it has been modified (or is new)
  if (!user.isModified('password')) {
    return next();
  }

  // generate a salt with 10 rounds
  bcrypt.genSalt(10, function (err, salt) {
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
UserSchema.methods.comparePassword = function(candidatePassword, callback) {
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

var User = mongoose.model('User', UserSchema);
var Game = mongoose.model('Game', GameSchema);
var Comment = mongoose.model('Comment', CommentSchema);

/*
  ____             _
 |  _ \ ___  _   _| |_ ___  ___
 | |_) / _ \| | | | __/ _ \/ __|
 |  _ < (_) | |_| | ||  __/\__ \
 |_| \_\___/ \__,_|\__\___||___/
 */

app.get('/add', function (req, res) {

  // only admin should be able to view Add Game page
  if (!req.session.user || req.session.user.isAdmin === false) {
    res.redirect('/');
  }

  res.render('add');
});

app.post('/add', function (req, res) {

  // create a client request to amazon.com
  request({ uri: req.body.gameURL }, function (err, response, body) {
    if (err && response.statusCode !== 200) {
      return;
    }

    // using jQuery to extract DOM information from Amazon.com
    jsdom.env({ html: body, scripts: ['http://code.jquery.com/jquery-1.6.min.js'] }, function (err, window) {
      var $ = window.jQuery;

      // title
      var title = $('#btAsinTitle').html();
      console.log($('#btAsinTitle').html());

      // price
      var price = $('#listPriceValue').html() || $('#actualPriceValue').text() ;
      console.log(price);


      // helper function to create a slug (e.g. Mass Effect 2 --> mass-effect-2)
      function slugify(text) {
        text = text.replace(/[^-a-zA-Z0-9\s]+/ig, '');
        text = text.replace(/-/gi, '_');
        text = text.replace(/\s/gi, '-');
        text = text.toLowerCase();
        return text;
      }

      // slug
      var slug = slugify(title).replace('amp', 'and');
      console.log(slug);

      // long game summary with screenshots
      if (!$('.productDescriptionWrapper .aplus').html()) {
        console.log('no aplus class');
        var summary = $('.productDescriptionWrapper').html();
      }
      // depending on the game, DOM might be structured differently on Amazon.com
      else {
        console.log('using aplus class');
        var summary = $('.productDescriptionWrapper .aplus').html();
      }

      // creating a new client request to Gamespot.com using sluggified title from Amazon.com
      request({uri: 'http://www.gamespot.com/' + slug + '/platform/xbox360'}, function (err, response, body) {
        if (err && response.statusCode !== 200) return;
        jsdom.env({ html: body, scripts: ['http://code.jquery.com/jquery-1.6.min.js'] }, function (err, window) {
          var $ = window.jQuery;

          // short description
          var description = $('.productDeck .mainDeck').text();
          console.log(description);

          // genre
          var genre = $('.genre .data').text();
          console.log(genre);

          // publisher
          var publisher = $('.publisher .data').text();
          console.log(publisher);

          // release date
          var temp = $('.date .data').text();
          var releaseDate = temp.replace('  (US) »', '');
          console.log(releaseDate);
          console.log(Date.parse(releaseDate));

          // thumbnail image
          // var thumbnail = $('.boxshot a img').attr('src');
          // request(thumbnail).pipe(fs.createWriteStream('./public/img/games/' + slug + '-thumb.jpg'));
          // var thumbnail = slug + '-thumb.jpg';
          // console.log(thumbnail);

          // large cover for the game
          // I used a regular expression 'replace' to replace thumb with front to match valid Gamespot URL
          var tempLarge = $('.boxshot a img').attr('src');
          var largeImage = tempLarge.replace('thumb', 'front');
          request(largeImage).pipe(fs.createWriteStream('./public/img/games/' + slug + '.jpg'));
          console.log(largeImage);
          var largeImage = slug + '.jpg';

          // game is a Schema object containing parsed information
          var game = new Game({
            title: title,
            slug: slug,
            publisher: publisher,
            largeImage: largeImage,
            genre: genre,
            price: price,
            summary: summary,
            description: description,
            releaseDate: releaseDate
          });

          // Prevents adding the same game twice
          Game.findOne({ 'slug': slug }, function (err, game) {
            if (game) {
              res.send(500, 'Halt: Games already exists');
            }
          });

          // Save game object into database as a document of db.games collection
          game.save(function(err) {
            if (err) {
              console.log(err);
              res.send(500, 'Unable to add the game to database');
            }
            console.log('Added game to MongoDB');
            res.redirect('/add');
          });
        });
      });
    });
  });
});

/**
 * GET /index
 */
app.get('/', function (req, res) {
  if (req.session.user && (req.session.user.tempPassword || req.session.user.interests.length < 3)) {
    res.redirect('/account');
  }
  if (req.session.user) {
    User
      .where('interests').in(req.session.user.interests)
      .where('userName').ne(req.session.user.userName)
      .populate('purchasedGames.game')
      .populate('ratedGames.game')
      .exec(function (err, similarUsers) {
        if (err) res.send(500, err);

        var accumulator = 0;
        _.each(similarUsers, function(user) {
          _.each(user.ratedGames, function () {
            accumulator++;
          });
          _.each(user.purchasedGames, function () {
            accumulator++;
          });
        });

        Game
          .where('genre').in(req.session.user.interests)
          .sort('-weightedScore')
          .limit(6)
          .exec(function (err, interestGames) {
            if (err) res.send(500, err);

            // Helper functions
            function games_union (arr1, arr2) {
              var union = arr1.concat(arr2);
              for (var i = 0; i < union.length; i++) {
                for (var j = i+1; j < union.length; j++) {
                  if (are_games_equal(union[i], union[j])) {
                    union.splice(i, 1);
                  }
                }
              }
              return union;
            }
            function are_games_equal(g1, g2) {
              return g1.title === g2.title;
            }

            var myInterestGames = [];
            var temp2 = [];

            // games 1, 2, 3
            _.each(interestGames, function (interestGame) {
              myInterestGames.push(interestGame);
            });

            // games 4, 5, 6
            _.each(similarUsers, function(user) {
              _.each(user.ratedGames, function (ratedGame) {
                if (ratedGame.myRating >= 4)
                  temp2.push(ratedGame.game);
              });
              _.each(user.purchasedGames, function (purchasedGame) {
                temp2.push(purchasedGame.game);
              });
            });

            temp2.sort(function(a,b) {
              return b.weightedRating - a.weightedRating;
            });

            _.each(temp2, function(e){
              console.log(e.weightedRating);
            });

            var recommendedGames;

            if (accumulator < 3) {
              recommendedGames = _.shuffle(myInterestGames);
            } else {
              recommendedGames = games_union(myInterestGames.slice(0,3), temp2);
            }

            res.render('index', {
              heading: 'CL4P-TP Online Store',
              lead: 'The leading next generation video games recommendation engine',
              user: req.session.user,
              recommendedGames:_.shuffle(recommendedGames.slice(0,6))
            });

        });
      });
  } else {
    Game
      .find()
      .limit(3)
      .sort('-weightedScore')
      .exec(function (err, game) {
        if (err) {
          throw err;
        }
        res.render('index', {
          heading: 'Welcome to CL4P-TP',
          lead: 'The leading next generation video games recommendation engine',
          frontpage: true,
          user: req.session.user,
          games: game
        });
      });
  }
});

/**
 * POST /buy
 */
app.post('/buy', function (req, res) {
  User.findOne({ 'userName': req.session.user.userName }, function (err, user) {
    if (err) res.send(500, err);
    Game.findOne({ 'slug': req.body.slug }, function (err, game) {
      if (err) res.send(500, err);
      var rating = 0;
      for (var i = 0; i < user.ratedGames.length; i++) {
        if (game.slug === user.ratedGames[i].slug) {
          console.log("I have already voted on this game");
          var rating = user.ratedGames[i].rating;
        }
      }
      user.purchasedGames.push({
        game: game._id
      });

      game.purchaseCounter++;
      game.save(function (err) {
        if (err) res.send(500, err);
      });

      user.save(function (err) {
        if (err) res.send(500, err);

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

        req.session.user = user;
        res.end();
      });
    });
  });
});

/**
 * POST /rate
 */
app.post('/games/rating', function (req, res) {
  User.findOne({ 'userName': req.session.user.userName }, function (err, user) {
    if (err) res.send(500, 'Could not find the user for rating POST request');

    Game.findOne({ 'slug': req.body.slug }, function (err, game) {
      if (err) res.send(500, 'No results for the rated game');

      game.votes++;
      game.rating = game.rating + Number(req.body.rating);
      game.weightedRating = game.rating + Number(req.body.rating) * user.ratingWeight;
      game.votedPeople.push(req.session.user.userName);

      user.ratedGames.push({
        game: game._id,
        myRating: req.body.rating
      });

      game.save(function (err) {
        if (err) res.send(500, err);
        console.log('rating info saved');
        console.log('votes', game.votes);
        console.log('rating', game.rating);
        console.log('weighted_rating',game.weightedRating);
        console.log('voted_people', game.votedPeople);
      });
    });

    req.session.ratings.push(parseInt(req.body.rating, 10));
    console.log(req.session.ratings);

    var sessionTotal = _.reduce(req.session.ratings, function (a, b) { return a + b; });
    var sessionAverage =  sessionTotal / req.session.ratings.length;
    console.log('session_total', sessionTotal);
    console.log('session_avg', sessionAverage);

    /**
     * Rating spam protection
     */
    if (!req.session.flagged && req.session.ratings.length >= 5 && (sessionAverage <= 1.5 || sessionAverage >= 4.5)) {
      req.session.flagged = true;
      user.ratingFlagCount++;
    }

    /**
     * When a system marks a user as flagged (per session), his/her rating weight goes down.
     * After getting flagged 3 times, the user will no longer be able to rate games until admin intervention.
     * If, admin decides to give rating privileges back to the user, flag count remains unchanged.
     * When a user gets flagged for 4th or 5th time, it's the same as getting flagged for the 1st and 2nd time.
     * Getting flagged 6 times means a user has been forgiven once, but still abused the rating system.
     */
    if (user.ratingFlagCount == 1) {
      user.ratingWeight = 0.75;
    } else if (user.ratingFlagCount == 2) {
      user.ratingWeight = 0.50;
    } else if (user.ratingFlagCount == 3) {
      if (user.ratingPardon) {
        user.suspendedAccount = true;
        user.suspendedRating = true;
      } else {
        user.suspendedRating = true;
      }
    }

    for (var i = 0; i < user.purchasedGames.length; i++) {
      if (user.purchasedGames[i].slug === req.body.slug) {
        user.purchasedGames[i].rating = req.body.rating;
      }
    }

    user.save(function (err) {
      if (err) res.send(500, err);
      return res.redirect('/games');
    });
  });
});

app.get('/games/api', function (req, res) {
  Game
    .find()
    .select('_id title')
    .exec(function (err, games) {
      res.send(games);
    });
});

/**
 * GET /games
 */
app.get('/games', function (req, res) {
  // users who have just registered must change temporary password before proceeding
  // also users who have less than 3 indicates interests
  if (req.session.user && (req.session.user.tempPassword || req.session.user.interests.length < 3)) {
    return res.redirect('/account');
  }

  // Returns top 25 most popular games from all categories
  Game
    .find()
    .limit(25)
    .sort('-weightedScore')
    .exec(function (err, games) {

      // to avoid issues, guests get a Games page without user
      if (!req.session.user) {
        return res.render('games', {
          heading: 'Top 25',
          lead: 'Game titles listed by popularity rating',
          games: games
        });
      }

      User
        .findOne({ 'userName': req.session.user.userName })
        .populate('purchasedGames.game')
        .exec(function (err, user) {
        res.render('games', {
          heading: 'Top 25',
          lead: 'Game titles listed by popularity rating',
          user: user,
          games: games
        });
      });
    });
});

/**
 * GET /games/detail
 */
app.get('/games/:detail', function (req, res) {
  if (req.session.user && (req.session.user.tempPassword || req.session.user.interests.length < 3)) {
    return res.redirect('/account');
  }

  Game.findOne({ 'slug': req.params.detail }, function (err, game) {
    if (err) res.send(500, err);

    Game
      .where('genre').equals(game.genre)
      .where('slug').ne(req.params.detail)
      .limit(6)
      .sort('-purchaseCounter')
      .exec(function (err, similarGames) {
        if (err) return res.send(500, err);

        Comment
          .find({ game: game._id })
          .populate('creator')
          .exec(function (err, comments) {
            if (err) res.send(500, err);

            if (req.session.user) {
              User
                .findOne({ 'userName': req.session.user.userName })
                .populate('purchasedGames.game')
                .exec(function (err, user) {
                  if (err) res.send(500, err);
                  res.render('detail', {
                    heading: game.title,
                    lead: game.publisher,
                    game: game,
                    similarGames: _.shuffle(similarGames),
                    comments: comments,
                    user: user
                  });
                });
            } else {
              res.render('detail', {
                heading: game.title,
                lead: game.publisher,
                game: game,
                similarGames: _.shuffle(similarGames),
                comments: comments
              });
            }
          });
      });
  });
});

/**
 * POST /games/detail
 */
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

/**
 * GET /games/genre
 */
app.get('/games/genre/:genre', function (req, res) {
  if (req.session.user && (req.session.tempPassword || req.session.user.interests.length < 3)) {
    return res.redirect('/account');
  }

  Game
    .where('genre').equals(new RegExp(req.params.genre, 'i'))
    .sort('-weightedScore')
    .exec(function (err, games) {
      if (err) res.send(500, err);
      if (!req.session.user) {
        res.render('games', {
          heading: _.first(games).genre,
          lead: 'Listing games by genre',
          games: games
        });
      } else {
        User
          .findOne({ 'userName': req.session.user.userName })
          .populate('purchasedGames.game')
          .exec(function (err, user) {
            if (err) res.send(500, err);
            res.render('games', {
              heading: _.first(games).genre,
              lead: 'Listing games by genre',
              user: user,
              games: games
            });
          });
      }
    });
});

app.get('/admin', function (req, res) {
  if (!req.session.user || req.session.user.isAdmin === false) {
    console.log('here');
    return res.redirect('/');
  }

  User.find(function (err, users) {
    if (err) {
      throw err;
    }
    Comment
      .find({ 'flagged': true })
      .populate('game')
      .populate('creator')
      .exec(function (err, comments) {
        User.findOne({ 'userName': req.session.user.userName }, function (err, user) {
          if (err) {
            throw err;
          }
          console.log(users.length);
          req.session.user = user;
          res.render('admin', {
            heading: 'Admin Dashboard',
            lead: 'Manage users, system analytics..',
            user: req.session.user,
            ratingFlagCount: req.session.ratingFlagCount,
            users: users,
            flaggedComments: comments
          });
        });
      });
  });
});

app.post('/admin/unsuspend', function (req, res) {
  User.findOne({ 'userName': req.body.username }, function (err, user) {
    user.suspendedRating = false;
    user.ratingFlagCount = 0;
    user.ratingWeight = 1;
    user.ratingPardon = true;
    user.save(function(err) {
      if (err) res.send(500, err);
      req.session.user = user;
    });
  });
});

app.post('/admin/comment/ignore', function (req,  res) {
  Comment.findOne({ _id: req.body.commentId }, function (err, comment) {
    if (err) {
      throw err;
    }
    comment.flagged = false;
    comment.save(function (err) {
      if (err) {
        throw err;
      }
      console.log('Comment has been unflagged');
    });
  });
});

app.post('/admin/comment/warn', function (req, res) {
  Comment
    .findOne({ '_id': req.body.commentId })
    .populate('creator')
    .exec(function (err, comment) {
      if (err) {
        throw err;
      }
      comment.hasBeenWarned = true;
      comment.save(function (err) {
        if (err) {
          throw err;
        }
        console.log('User has been warned. Setting warned flag to TRUE');
      });
      console.log(comment.creator.userName);
      User.findOne({ 'userName': comment.creator.userName }, function (err, user) {
        user.warningCount++;
        if (user.warningCount >= 2) {
          user.suspendedAccount = true;
        }
        user.save(function(err) {
          req.session.user = user;
          console.log('user warning count has been incremented by one');
        });
      });
    });
});

app.post('/admin/comment/delete', function (req, res) {
  Comment.remove({ _id: req.body.commentId }, function (err) {
    if (err) {
      throw err;
    }
    console.log('Comment has been removed');
  });
});

app.post('/comment/delete', function (req, res) {
  Comment.remove({ _id: req.body.commentId }, function (err) {
    if (err) {
      throw err;
    }
    console.log('Comment has been removed');
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

/**
 * GET /account
 */
app.get('/account', function (req, res) {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  User
    .findOne({ 'userName': req.session.user.userName })
    .populate('purchasedGames.game')
    .populate('ratedGames.game')
    .exec(function (err, user) {
      if (err) res.send(500, err);

      console.log(req.session.user.tempPassword);
      console.log(req.session.user.interests.length);


      res.render('account', {
        heading: 'Account Information',
        lead: 'View purchase history, update account, choose interests',
        user: user,
        tempPassword: req.session.user.tempPassword,
        isSuspended: req.session.user.suspendedAccount
      });
    });
});

/**
 * POST /account
 */
app.post('/account', function (req, res) {
  User.findOne({ 'userName': req.session.user.userName }, function (err, user) {
    if (err) res.send(500, err);

    user.firstName = req.body.firstName;
    user.lastName = req.body.lastName;
    user.gamertag = req.body.gamertag;

    if (!req.body.newpassword) {
      user.password = req.session.user.password;
    } else {
      user.password = req.body.newpassword;
      user.tempPassword = false;
    }

    user.save(function (err) {
      if (err) res.send(500, err);
      req.session.user = user;
      res.redirect('/account');
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
      if (err) res.send(500, err);
      console.log('Saved ' + uniqueArray);
    });
  });
});

app.post('/account/tag/delete', function (req, res) {
  User.findOne({ 'userName': req.session.user.userName }, function (err, user) {
    var index = user.interests.indexOf(req.body.removedTag);
    user.interests.splice(index, 1);
    user.save(function (err) {
      if (err) {
        return res.send(500, err);
      }
      console.log('Saved!');
    });

    // update user session object to avoid inconsistency
    req.session.user = user;
    console.log('Removed ' + req.body.removedTag + ' from interests.');
  });
});

/**
 * GET /logout
 */
app.get('/logout', function (req, res) {
  if (!req.session.user) {
    res.redirect('/');
  }
  else {
    // fix for per user flag count
    if (req.session.ratingFlagCount) {
      User.update({ 'userName': req.session.user.userName }, { $inc: { ratingFlagCount: 1 } });
    }

    if (req.session.user.suspendedAccount) {
      User.remove({ 'userName': req.session.user.userName });
    }

    req.session.destroy(function () {
      res.redirect('/');
    });
  }

});

/**
 * GET /login
 */
app.get('/login', function(req, res) {
  if (req.session.user) res.redirect('/');

  res.render('login', {
    heading: 'Sign In',
    lead: 'Use the login form if you are an existing user',
    user: req.session.user,
    incorrectLogin: req.session.incorrectLogin,
    message: { success: req.session.message }
  });
});

/**
 * POST /login
 */
app.post('/login', function (req, res) {

  User.findOne({ 'userName': req.body.userName }, function (err, user) {
    if (err) res.send(500, err);

    if (!user) {
      req.session.incorrectLogin = true;
      res.redirect('/login');
    } else {
      user.comparePassword(req.body.password, function(err, isMatch) {
        if (err) res.send(500, err);

        if (!isMatch) {
          req.session.incorrectLogin = true;
          res.redirect('/login');
        } else {
          if (user.suspendedAccount) {
            res.redirect('/account');
          } else {
            delete req.session.incorrectLogin;
            req.session.user = user;
            req.session.ratings = [];
            res.redirect('/');
          }
        }
      });
    }
  });
});

/**
 * GET /register
 */
app.get('/register', function(req, res) {
  if (req.session.user) res.redirect('/');

  res.render('register', {
    heading: 'Create Account',
    lead: 'Register with us to get your own personalized profile',
  });
});

/**
 * POST /register
 */
app.post('/register', function(req, res) {
  // Helper function to generate a unique username
  function usernamify(first, last) {
    first = first[0].toLowerCase();
    last = last.replace(/[^-a-zA-Z0-9\s]+/ig, '');
    last = last.replace(/-/gi, '');
    last = last.replace(/\s/gi, '');
    last = last.toLowerCase();
    return first + last + Math.floor(Math.random() * 1000);
  }

  var firstName = req.body.firstName;
  var lastName = req.body.lastName;
  var email = req.body.userEmail;
  var userName = usernamify(firstName, lastName);

  var user = new User({
    firstName: firstName,
    lastName: lastName,
    email: email,
    userName: userName,
    password: userName,
    tempPassword: true
  });

  User.findOne({ 'isAdmin': true }, function (err, admin) {
    if (err) res.send(500);

    user.isAdmin = !admin;

    user.save(function (err) {
      if (err) res.send(500, 'Duplicate username detected. Try again.');
      req.session.user = user;
      req.session.ratings = [];
      res.redirect('/account');
    });
  });
});

/**
 * GET /profile
 */
app.get('/:profile', function (req, res) {
  if (req.session.user && (req.session.user.tempPassword || req.session.user.interests.length < 3)) {
    return res.redirect('/account');
  }

  User.findOne({ 'userName': req.params.profile }, function (err, user) {
    if (!user) {
      console.log('Profile not found');
      return res.send(500, 'User profile does not exist');
    }

    request('http://360api.chary.us/?gamertag=' + user.gamertag, function (error, response, body) {
      if (!error && response.statusCode === 200) {

        var xbox_api = JSON.parse(body);

        res.render('profile', {
          heading: user.firstName + '\'s Profile',
          lead: 'View your Xbox live achievements, interests, game purchases...',
          user: req.session.user,
          userProfile: user,
          xbox: xbox_api
        });

      }
      else {
        // continue as if the user does not have the Xbox gamertag

        console.log('Error getting Xbox Live data');

        req.session.user = user;

        res.render('profile', {
          heading: user.firstName + '\'s Profile',
          lead: 'View your Xbox live achievements, interests, game purchases...',
          user: req.session.user,
          userProfile: user,
          xbox: false
        });

      }
    });

  });
});

server.listen(app.get('port'), function() {
  console.log('Express server listening on port ' + app.get('port'));
});