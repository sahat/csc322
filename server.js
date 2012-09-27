// game exploration / recommendation engine
// registration
//  - e-mail, password, confirm password
//  - redirect to a page with a mini survey to find out
//    what type of games user likes to play
//  - not necessary to complete the survey in order to use the site
//  - displays thumnails of recommended games on a user's profile
//  - /games displays all available games as a paginated list
//  - each game detail page should have similar games that user might like
//    (customers who have purchased this item also purchased X)
//  - buy game / add to cart functionality
//
/**
 * Module dependencies.
 */
var express = require('express'),
    //hash = require('./pass').hash;
    http = require('http'),
    path = require('path');

var app = express();

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
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

app.get('/', function(req, res) {
  res.render('index', { title: 'ORANGECUBE' });
});
app.get('/login', function(req, res) {
  res.render('login');
});
//app.get('/games', index);
//app.get('/games/:id', routes.index);
//app.get('/users', user.list);
//app.get('/users/:username', index);

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
