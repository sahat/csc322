var db = require('../db')

/*
 *   _____ ______ _______       ___             _
 *  / ____|  ____|__   __|     / / |           (_)
 * | |  __| |__     | |       / /| | ___   __ _ _ _ __
 * | | |_ |  __|    | |      / / | |/ _ \ / _` | | '_ \
 * | |__| | |____   | |     / /  | | (_) | (_| | | | | |
 *  \_____|______|  |_|    /_/   |_|\___/ \__, |_|_| |_|
 *                                         __/ |
 *                                        |___/
 */
exports.get =  function(req, res) {
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
};

/*
 *  _____   ____   _____ _______       ___             _
 * |  __ \ / __ \ / ____|__   __|     / / |           (_)
 * | |__) | |  | | (___    | |       / /| | ___   __ _ _ _ __
 * |  ___/| |  | |\___ \   | |      / / | |/ _ \ / _` | | '_ \
 * | |    | |__| |____) |  | |     / /  | | (_) | (_| | | | | |
 * |_|     \____/|_____/   |_|    /_/   |_|\___/ \__, |_|_| |_|
 *                                                __/ |
 *                                               |___/
 */
exports.post = function (req, res) {
  db.User.findOne({ 'userName': req.body.userName }, function (err, user) {
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
};