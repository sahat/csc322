var db = require('../db')

exports.get = function(req, res) {
  if (req.session.flagCount) {
    db.User.update({ 'userName': req.session.user.userName },
      { $inc: { flagCount: 1 } },
      function (err) {
        if (err) {
          throw err;
        }
      });
  }
  if (req.session.user.suspendedAccount) {
    db.User.remove({ 'userName': req.session.user.userName }, function (err) {
      if (err) {
        throw err;
      }
      console.log('User account has been removed');
    });
  }

  req.session.destroy(function (){
    res.redirect('/');
  });
};