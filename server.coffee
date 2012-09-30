express = require('express')
path = require('path')
http = require('http')
mongoose = require('mongoose')
MongoStore = require('connect-mongo')(express);

db = mongoose.connect('mongodb://localhost/test')

UserSchema = new mongoose.Schema
  email:
    type: String
    required: true
    index:
      unique: true
  password:
    type: String
    required: true

UserModel = mongoose.model('User', UserSchema)

app = express()

app.configure ->
  app.set 'port', process.env.PORT or 3000
  app.set 'views', __dirname + '/views'
  app.set 'view engine', 'jade'
  app.locals.pretty = true
  app.use express.favicon()
  app.use express.logger('dev')
  app.use express.bodyParser()
  app.use express.cookieParser('s3cr3t')
  app.use express.session
    secret: 's3cr3t'
    store: new MongoStore(db: 'localhost')
  app.use express.methodOverride()
  app.use app.router
  app.use express.static(path.join(__dirname, 'public'))

app.configure 'development', ->
  app.use express.errorHandler()

app.get '/', (req, res) ->
  res.render 'index',
    heading: 'N7 Online Store'
    lead: 'The leading next generation video games recommendation engine'

app.get '/login', (req, res) ->
  res.render 'login',
    heading: 'Sign In'
    lead: 'Use the login form if you are an existing user'

app.get '/register', (req, res) ->
  res.render 'register',
    heading: 'Create Account'
    lead: 'Register with us to get your own personalized profile'

app.post '/register', (req, res) ->
  user = new UserModel
    email: req.body.userEmail
    password: req.body.password

  req.session.email = req.body.userEmail
  req.session.password = req.body.password

  user.save (err) ->
    unless err
      console.log 'Saved to DB successfully!'
      res.redirect '/login'
    else
      res.render 'Something wrong happened with MongoDB'

http.createServer(app).listen app.get('port'), ->
  console.log 'Express server listening on port ' + app.get('port')

