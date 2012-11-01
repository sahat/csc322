var db = require('../db')
var _ = require('underscore');
_.str = require('underscore.string');
_.mixin(_.str.exports());

exports.get = function (req, res) {

  // users who have just registered must change temporary password before proceeding
  // also users who have less than 3 indicates intersts
  if (req.session.tempPassword || (req.session.user && req.session.user.interests.length < 3)) {
    return res.redirect('/account');
  }

  // Returns top 25 most popular games from all categories
  db.Game
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

      db.User.findOne({ 'userName': req.session.user.userName }, function (err, user) {
        res.render('games', {
          heading: 'Top 25',
          lead: 'Game titles listed by popularity rating',
          user: user,
          games: games
        });
      });

    });
};


exports.getGameDetail = function (req, res) {

  // newly registered users must first change their password and add 3 interests before viewing this page
  if (req.session.user) {
    if (req.session.tempPassword || req.session.user.interests.length < 3) {
      return res.redirect('/account');
    }
  }

  //
  db.Game.findOne({ 'slug': req.params.detail }, function (err, game) {
    if (err) {
      return res.send(500, err);
    }

    // we can ommit .find() because .where() method implicitly uses .find()
    db.Game
      .where('genre').equals(game.genre)
      .where('slug').ne(req.params.detail)
      .limit(6)
      .exec(function (err, similarGames) {
        if (err) {
          return res.send(500, err);
        }

        // returns comments posted under the particular game
        db.Comment
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
};

exports.postGameDetail = function (req, res) {
  console.log(req.body.comment);

  // move into comment/add method
  db.User.findOne({ userName: req.session.user.userName }, function (err, user) {
    db.Game.findOne({ slug: req.params.detail }, function (err, game) {
      var comment = new db.Comment({
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
};

exports.getGameByGenre = function (req, res) {
  if (req.session.tempPassword || (req.session.user && req.session.user.interests.length < 3)) {
    return res.redirect('/account');
  }
  db.Game
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
      db.User.findOne({ 'userName': req.session.user.userName }, function (err, user) {
        res.render('games', {
          heading: _.first(games).genre,
          lead: 'Listing games by genre',
          user: user,
          games: games
        });
      });
    });
};

exports.api = function (req, res) {
  db.Game
    .find()
    .select('_id title')
    .exec(function (err, games) {
      res.send(games);
    });
};