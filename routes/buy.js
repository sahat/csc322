var db = require('../db')

exports.post = function (req, res) {
  db.User.findOne({ 'userName': req.session.user.userName }, function (err, user) {
    db.Game.findOne({ 'slug': req.body.slug }, function (err, game) {
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
};