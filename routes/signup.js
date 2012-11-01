var db = require('../db')

exports.get = function(req, res) {
  if (req.session.user) {
    res.redirect('/');
  }
  res.render('register', {
    heading: 'Create Account',
    lead: 'Register with us to get your own personalized profile',
    message: req.session.message
  });
};


exports.post = function(req, res) {
  var firstLetterOfFirstName = req.body.firstName[0].toLowerCase();
  var lastName = req.body.lastName.toLowerCase();
  var randomNumber = Math.floor(Math.random() * 1000);
  var userName = firstLetterOfFirstName + lastName + randomNumber;

  var newUser = new db.User({
    userName: userName,
    password: userName,
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    email: req.body.userEmail
  });

  db.User.findOne({'isAdmin': true }, function (err, user) {
    if (!user) {
      console.log('no users that are admin');
      newUser.isAdmin = true;
    } else {
      console.log('admin already exists');
      newUser.isAdmin = false;
    }
  });

  newUser.save(function (err) {
    if (err) {
      res.send(500, 'Halt: Duplicate Username Detected');
    } else {
      req.session.user = newUser;
      req.session.tempPassword = true;
      // create session to keep track of votes
      req.session.flagCount = 0;
      req.session.voteCount = 0;
      req.session.avgRating = 0;
      req.session.rating = 0;
      res.redirect('/account');
    }
  });
};