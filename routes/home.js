var db = require('../db');

exports.get = function(req, res) {

  // users with less than 3 intersts or who still use temp. password should not be able to view this page
  if (req.session.tempPassword || (req.session.user && req.session.user.interests.length < 3)) {
    return res.redirect('/account');
  }

  // If user is logged in, display 3 items based on interests and 3 based on previous purchases
  if (req.session.user) {
    db.Game
      .find()
      .or([{ title: { $in: req.session.user.interests } }, { genre: { $in: req.session.user.interests } }])
      .limit(3)
      .sort('-weightedScore')
      .exec(function (err, interestGames) {
        if (err) {
          throw err;
        }
        db.Game
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
    db.Game
      .find()
      .limit(3)
      .sort('-weightedScore')
      .exec(function(err, game) {
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
};