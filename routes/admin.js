var db = require('../db')

exports.get = function (req, res) {
  if (!req.session.user || req.session.user.isAdmin === false) {
    console.log('here');
    return res.redirect('/');
  }

  db.User.find(function (err, users) {
    if (err) {
      throw err;
    }
    db.Comment
      .find({ 'flagged': true })
      .populate('game')
      .populate('creator')
      .exec(function (err, comments) {
        db.User.findOne({ 'userName': req.session.user.userName }, function (err, user) {
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
};


exports.unsuspend = function (req, res) {
  db.User.findOne({ 'userName': req.body.username }, function (err, user) {
    user.suspendedRating = false;
    user.save(function() {
      req.session.user = user;
    });
  });
};


exports.ignoreComment = function (req,  res) {
  db.Comment.findOne({ _id: req.body.commentId }, function (err, comment) {
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
};


exports.warnComment = function (req, res) {
  db.Comment
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
      db.User.findOne({ 'userName': comment.creator.userName }, function (err, user) {
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
};


exports.deleteComment = function (req, res) {
  db.Comment.remove({ _id: req.body.commentId }, function (err) {
    if (err) {
      throw err;
    }
    console.log('Comment has been removed');
  });
};