var express = require('express'),
    //hash = require('./pass').hash,
    http = require('http'),
    path = require('path');

var app = express();

app.configure(function(){
    app.set('port', process.env.PORT || 3000);
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');
    app.locals.pretty = true;
    app.use(express.favicon());
    app.use(express.logger('dev'));
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(app.router);
    app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
    app.use(express.errorHandler());
});

app.get('/', function (req, res) {
    res.render('index', { heading: 'N7 Online Store', lead: 'The leading next generation video games recommendation engine' });
});
app.get('/login', function (req, res) {
  res.render('login', { heading: 'Sign In', lead: 'Use the login form if you are an existing user' });
});
app.get('/register', function (req, res) {
  res.render('register', { heading: 'Create Account', lead: 'Register with us to get your own personalized profile' });
});
app.post('/register', function (req, res) {
  console.log("Email is " + req.body.inputEmail);
  res.redirect('/');
});
//app.get('/games/:id', routes.index);
//app.get('/users', user.list);
//app.get('/users/:username', index);


http.createServer(app).listen(app.get('port'), function(){
    console.log("Express server listening on port " + app.get('port'));
});