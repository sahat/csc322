var db = require('../db');
var request = require('request');

exports.get = function (req, res) {
  if (req.session.user) {
    if (req.session.tempPassword || req.session.user.interests.length < 3) {
      return res.redirect('/account');
    }
  }

  db.User.findOne({ 'userName': req.params.profile }, function (err, user) {
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
};
