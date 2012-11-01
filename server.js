// TODO: user hasn't purchased 3 games yet, so list 6 games based on interests only
// after 3 purchases, list 3 similar games to the purchased games

// TODO: recommendation: find all users with similar interests, look at what
// they purchased, return 3 games in highest rated order

var fs = require('fs');
var express = require('express');
var path = require('path');
var http = require('http');
var mongoose = require('mongoose');
var email = require('emailjs');
var bcrypt = require('bcrypt');
var RedisStore = require('connect-redis')(express);
var jsdom = require('jsdom');
var request = require('request');
var io = require('socket.io');
var _ = require('underscore');
_.str = require('underscore.string');
_.mixin(_.str.exports());
//var routes = require('./routes');

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
  game: { type: mongoose.Schema.Types.ObjectId, ref: 'Game' },
  body: {type: String, required: true },
  date: {type: Date, default: Date.now },
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
app.use(express.session({ store: new RedisStore(), secret: 's3cr3t' }));
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
      request({uri: 'http://www.gamespot.com/' + slug + '/platform/pc/'}, function (err, response, body) {
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
          var thumbnail = $('.boxshot a img').attr('src');
          request(thumbnail).pipe(fs.createWriteStream('./public/img/games/' + slug + '-thumb.jpg'));
          var thumbnail = slug + '-thumb.jpg';
          console.log(thumbnail);

          // large cover for the game
          // I used a regular expression 'replace' to replace thumb with front to match valid Gamespot URL
          var tempLarge = $('.boxshot a img').attr('src');
          var largeImage = tempLarge.replace('thumb', 'front');
          request(largeImage).pipe(fs.createWriteStream('./public/img/games/' + slug + '-large.jpg'));
          console.log(largeImage);
          var largeImage = slug + '-large.jpg';

          // game is a Schema object containing parsed information
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

app.get('/', function(req, res) {

  // users with less than 3 intersts or who still use temp. password should not be able to view this page
  if (req.session.tempPassword || req.session.user && req.session.user.interests.length < 3) {
    return res.redirect('/account');
  }

  // If user is logged in, display 3 items based on interests and 3 based on previous purchases
  if (req.session.user) {
    Game
      .find()
      .or([{ title: { $in: req.session.user.interests } }, { genre: { $in: req.session.user.interests } }])
      .limit(3)
      .sort('-weightedScore')
      .exec(function (err, interestGames) {
        if (err) {
            throw err;
        }
        Game
        .find()
        .sort('-purchaseCounter')
        .limit(3)
        .exec(function (err, purchasedGames) {
          res.render('index', {
            heading: 'CL4P-TP Online Store',
            lead: 'The leading next generation video games recommendation engine',
            user: req.session.user,
            interestGames: interestGames,
            purchasedGames: purchasedGames
          });
        });

        /*
          User
          .find()
          .where('userName').ne(req.session.user.userName)
          .select('purchasedGames')
          .exec(function (err, users) {
            var tempArr = [];

            _.each(users, function(user) {
              tempArr.push(user.purchasedGames)
            });

            var tempPurchasedGames = _.flatten(tempArr);
            var purchasedGames = [];

            _.each(tempPurchasedGames, function (game) {
              purchasedGames.push(game.title);
            });


            console.log(purchasedGames.sort());
            });
            */




      });
  }
  // Visitors get 3 most popular game titles instead
  else {
    Game
      .find()
      .limit(3)
      .sort('-weightedScore')
      .exec(function(err, game) {
        if (err) {
          throw err;
        }
        res.render('index', {
          heading: 'CL4P-TP Online Store',
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
        if (game.slug === user.ratedGames[i].slug) {
          console.log("I have already voted on this game");
          var rating = user.ratedGames[i].rating;
        }
      }

      user.purchasedGames.push({
        title: game.title,
        slug: game.slug,
        rating: rating,
        thumbnail: game.thumbnail
      });

      // keep track of how many people bought the game
      game.purchaseCounter++;

      game.save(function (err) {
        console.log('Purchase counter incremented by 1');
      });

      user.save(function (err) {
        if (err) {
          return res.send(500, err);
        }

        console.log('Purchased game added to the list');

        // E-mail server settings
        var server = email.server.connect({
          user:    "username",
          password:"password",
          host:    "smtp.gmail.com",
          ssl:     true
        });

        // Send the following e-mail message after purchasing a game
        server.send({
          text: 'Thank you for purchasing ' + game.title + '. Your game will be shipped within 2 to 3 business days.',
          from: 'Sahat Yalkabov <sakhat@gmail.com>',
          to: user.firstName + ' ' + user.lastName + ' <' + user.email + '>',
          subject: 'Order Confirmation'
          }, function(err, message) {
          console.log(err || message);
        });
      });
      req.session.user = user;
    });
  });
  res.redirect('/games');
});


app.post('/games/rating', function (req, res) {

  // Default weight coefficient for all users
  req.session.weight = 1;

  Game.update({ 'slug': req.body.slug }, { $inc: { rating: req.body.rating, votes: 1 } }, function (err) {
    if (err) {
      console.log(err);
      return res.send(500, 'Could not increment game rating and vote count');
    }
    console.log('Successfully updated game rating and vote count');
  });

  User.findOne({ 'userName': req.session.user.userName }, function (err, user) {
    if (err) {
      console.log(err);
      return res.send(500, 'Could not find the user for rating POST request');
    }
    Game.findOne({ 'slug': req.body.slug }, function (err, game) {
      if (err) {
        console.log(err);
        return res.send(500, 'No results for the rated game');
      }

      req.session.voteCount++;
      console.log('Session Vote Count: ' + req.session.voteCount);

      req.session.rating = parseInt(req.session.rating, 10) + parseInt(req.body.rating, 10);
      console.log('Session Rating: ' + req.session.rating);

      req.session.avgRating = req.session.rating / req.session.voteCount;
      console.log('Session Avg Rating: ' + req.session.avgRating);

      // Rating spam protection
      if (req.session.voteCount >= 5 && (req.session.avgRating <= 1.75 || req.session.avgRating >= 4.75)) {
        req.session.flagCount = true;
        req.session.weight = 0.5;
        console.log('User\'s rating flag counter has been incremented');
        console.log('Weight coefficient is set to 0.5');
      }

      if (req.session.flagCount) {
        req.session.weight = 0.5;
      }

      if (user.flagCount === 3) {
        user.suspendedRating = true;
        console.log('Suspended rating privileges. No longer can rate.');
      }

      if (user.flagCount >= 6) {
        user.suspendedRating = true;
        user.suspendedAccount = true;
        console.log('Suspended rating privileges. Account scheduled for termination.');
      }

      console.log('MongoDB Game Rating: ' + game.rating);
      console.log('POST Game Rating: ' + req.body.rating);
      console.log('User Weight Coefficient: ' + req.session.weight);

      game.weightedScore = game.rating + req.body.rating * req.session.weight;
      console.log('Game Weighted Score: ' + game.weightedScore);

      game.votedPeople.push(req.session.user.userName);

      game.save(function (err) {
        if (err) {
          throw err;
        }
        console.log('Successfully Set New Average Rating');
      });

      for (var i = 0; i < user.purchasedGames.length; i++) {
        if (user.purchasedGames[i].slug === req.body.slug) {
          user.purchasedGames[i].rating = req.body.rating;
        }
      }

      user.ratedGames.push({
        title: game.title,
        slug: game.slug,
        rating: req.body.rating
      });

      user.save(function (err) {
        if (err) {
          throw err;
        }
        return res.redirect('/games');
      });
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


app.get('/games', function (req, res) {

  // users who have just registered must change temporary password before proceeding
  // also users who have less than 3 indicates intersts
  if (req.session.tempPassword || req.session.user && req.session.user.interests.length < 3) {
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
          heading: 'All Games',
          lead: 'Game titles listed in alphabetical order',
          games: games
        });
      }

      User.findOne({ 'userName': req.session.user.userName }, function (err, user) {
        res.render('games', {
          heading: 'Top 25',
          lead: 'Game titles listed by popularity rating',
          user: user,
          games: games
        });
      });

    });
});


app.get('/games/:detail', function (req, res) {

  // newly registered users must first change their password and add 3 interests before viewing this page
  if (req.session.user) {
    if (req.session.tempPassword || req.session.user.interests.length < 3) {
      return res.redirect('/account');
    }
  }

  //
  Game.findOne({ 'slug': req.params.detail }, function (err, game) {
    if (err) {
      return res.send(500, err);
    }

    // we can ommit .find() because .where() method implicitly uses .find()
    Game
      .where('genre').equals(game.genre)
      .where('slug').ne(req.params.detail)
      .limit(6)
      .exec(function (err, similarGames) {
        if (err) {
          return res.send(500, err);
        }

        // returns comments posted under the particular game
        Comment
          .find({ game: game._id })
          .populate('creator')
          .exec(function (err, comments) {
            if (err) {
              return res.send(500, err);
            }
            res.render('detail', {
              heading: game.title,
              lead: game.publisher,
              game: game,
              similarGames:_.shuffle(similarGames),
              comments: comments,
              user: req.session.user
            });
          });
      });
  });
});

app.get('/games/genre/:genre', function (req, res) {
  if (req.session.tempPassword || req.session.user && req.session.user.interests.length < 3) {
    return res.redirect('/account');
  }
  Game
    .find()
    .where('genre').equals(new RegExp(req.params.genre, 'i'))
    .sort('-weightedScore')
    .exec(function (err, games) {
      if (!req.session.user) {
        return res.render('games', {
          heading: _.first(games).genre,
          lead: 'Listing games by genre',
          games: games
        });
      }
      User.findOne({ 'userName': req.session.user.userName }, function (err, user) {
        res.render('games', {
          heading: _.first(games).genre,
          lead: 'Listing games by genre',
          user: user,
          games: games
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
          req.session.user = user;
          res.render('admin', {
            heading: 'Admin Dashboard',
            lead: 'Manage users, system analytics..',
            user: req.session.user,
            flagCount: req.session.flagCount,
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
    user.save(function() {
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


app.get('/account', function (req, res) {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  console.log(req.session.user.purchasedGames);
  User.findOne({ userName: req.session.user.userName }, function (err, user) {
    Game.find(function (err, games) {
      var tagArray = [];
      _.each(games, function (game) {
        tagArray.push(game.title);
      });
      req.session.user = user;
      console.log(user.purchasedGames);
      res.render('account', {
        heading: 'Account Information',
        lead: 'View purchase history, update account, choose interests',
        user: req.session.user,
        tags: tagArray,
        tempPassword: req.session.tempPassword,
        isSuspended: user.suspendedAccount
      });
    });
  });
});


app.post('/account', function (req, res) {
  User.findOne({ 'userName': req.session.user.userName }, function (err, user) {
    user.firstName = req.body.firstName;
    user.lastName = req.body.lastName;
    user.password = (!req.body.newpassword) ? req.session.user.password : req.body.newpassword;
    user.gamertag = req.body.gamertag;
    if (req.body.newpassword) {
      user.password = req.body.newpassword;
      delete req.session.tempPassword;
    }
    user.save(function(err) {
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


app.get('/logout', function(req, res) {
  if (req.session.flagCount) {
    User.update({ 'userName': req.session.user.userName },
                { $inc: { flagCount: 1 } },
                function (err) {
                  if (err) {
                      throw err;
                  }
                });
  }
  if (req.session.user.suspendedAccount) {
      User.remove({ 'userName': req.session.user.userName }, function (err) {
        if (err) {
            throw err;
        }
        console.log('User account has been removed');
      });
    }

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
    message: { success: req.session.message }
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
          if (user.suspendedAccount) {
            res.redirect('/account');
          }
          else {
            delete req.session.incorrectLogin;
            req.session.user = user;
            // create session to keep track of votes
            req.session.voteCount = 0;
            req.session.avgRating = 0;
            req.session.rating = 0;
            res.redirect('/');
          }
        } else {
          // incorrect login
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
      // create session to keep track of votes
      req.session.flagCount = 0;
      req.session.voteCount = 0;
      req.session.avgRating = 0;
      req.session.rating = 0;
      res.redirect('/account');
    }
  });
});


app.get('/:profile', function (req, res) {
  if (req.session.user) {
    if (req.session.tempPassword || req.session.user.interests.length < 3) {
      return res.redirect('/account');
    }
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

        res.render('public_profile', {
          heading: user.firstName + '\'s Profile',
          lead: 'View your Xbox live achievements, interests, game purchases...',
          user: req.session.user,
          xbox: false
        });

      }
    });

   });
});


var server = http.createServer(app).listen(app.get('port'), function() {
  console.log('Express server listening on port ' + app.get('port'));
});
