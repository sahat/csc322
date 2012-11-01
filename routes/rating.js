var db = require('../db')

exports.post = function (req, res) {

  // Default weight coefficient for all users
  req.session.weight = 1;

  db.Game.update({ 'slug': req.body.slug }, { $inc: { rating: req.body.rating, votes: 1 } }, function (err) {
    if (err) {
      console.log(err);
      return res.send(500, 'Could not increment game rating and vote count');
    }
    console.log('Successfully updated game rating and vote count');
  });

  db.User.findOne({ 'userName': req.session.user.userName }, function (err, user) {
    if (err) {
      console.log(err);
      return res.send(500, 'Could not find the user for rating POST request');
    }
    db.Game.findOne({ 'slug': req.body.slug }, function (err, game) {
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
};