// TODO: user hasn't purchased 3 games yet, so list 6 games based on interests only
// after 3 purchases, list 3 similar games to the purchased games

// TODO: recommendation: find all users with similar interests, look at what
// they purchased, return 3 games in highest rated order

var fs = require('fs');
var express = require('express');
var path = require('path');
var http = require('http');
var email = require('emailjs');
var bcrypt = require('bcrypt');
var RedisStore = require('connect-redis')(express);
var jsdom = require('jsdom');
var io = require('socket.io');
var _ = require('underscore');
_.str = require('underscore.string');
_.mixin(_.str.exports());

// routes
var login = require('./routes/login');
var account = require('./routes/account');
var addgame = require('./routes/addgame');
var signup = require('./routes/signup');
var games = require('./routes/games');
var rating = require('./routes/rating');
var buy = require('./routes/buy');
var admin = require('./routes/admin');
var logout = require('./routes/logout');
var comment = require('./routes/comment');
var home = require('./routes/home');
var profile = require('./routes/profile');

var db = require('./db');




/*
  ____       _   _   _
 / ___|  ___| |_| |_(_)_ __   __ _ ___
 \___ \ / _ \ __| __| | '_ \ / _` / __|
  ___) |  __/ |_| |_| | | | | (_| \__ \
 |____/ \___|\__|\__|_|_| |_|\__, |___/
                             |___/
 */

var app = express();

app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.locals.pretty = true;
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.cookieParser('s3cr3t'));
app.use(express.session({ store: new RedisStore(), secret: 's3cr3t' }));
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));
app.configure('development', function() {
  app.use(express.errorHandler());
});

/*
  ____             _
 |  _ \ ___  _   _| |_ ___  ___
 | |_) / _ \| | | | __/ _ \/ __|
 |  _ < (_) | |_| | ||  __/\__ \
 |_| \_\___/ \__,_|\__\___||___/
 */

app.get('/add', addgame.get);
app.post('/add', addgame.post);

app.get('/', home.get);

app.post('/buy', buy.post);

app.post('/games/rating', rating.post);
app.get('/games/api', games.api);
app.get('/games', games.get);

app.get('/games/:detail', games.getGameDetail);
app.post('/games/:detail', games.postGameDetail);
app.get('/games/genre/:genre', games.getGameByGenre);

app.get('/admin', admin.get);
app.post('/admin/unsuspend', admin.unsuspend);
app.post('/admin/comment/ignore', admin.ignoreComment);
app.post('/admin/comment/warn', admin.warnComment);
app.post('/admin/comment/delete', admin.deleteComment);

app.post('/comment/delete', comment.delete);
app.post('/comment/report', comment.report);

app.get('/account', account.get);
app.post('/account', account.post);
app.post('/account/tag/add', account.addTag);
app.post('/account/tag/delete', account.removeTag);

app.get('/logout', logout.get);
app.get('/login', login.get);
app.post('/login', login.post);

app.get('/register', signup.get);
app.post('/register', signup.post);

app.get('/:profile', profile.get);


var server = http.createServer(app).listen(app.get('port'), function() {
  console.log('Express server listening on port ' + app.get('port'));
});
