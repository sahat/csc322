var _ = require('underscore');
var db = require('../db')

exports.get =  function (req, res) {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  console.log(req.session.user.purchasedGames);
  db.User.findOne({ userName: req.session.user.userName }, function (err, user) {
    db.Game.find(function (err, games) {
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
};


exports.post = function (req, res) {
  db.User.findOne({ 'userName': req.session.user.userName }, function (err, user) {
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
};


exports.addTag = function (req, res) {
  db.User.findOne({ 'userName': req.session.user.userName }, function (err, user) {
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
};


exports.removeTag = function (req, res) {
  db.User.findOne({ 'userName': req.session.user.userName }, function (err, user) {
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
};