var db = require('../db');

exports.delete = function (req, res) {
  db.Comment.remove({ _id: req.body.commentId }, function (err) {
    if (err) {
      throw err;
    }
    console.log('Comment has been removed');
  });
};


exports.report = function (req, res) {
  db.Comment.findOne({ '_id': req.body.comment_id }, function (req, comment) {
    console.log(comment);
    comment.flagged = true;
    comment.save(function (err) {
      console.log('Comment has been reported');
    });
  });
};
