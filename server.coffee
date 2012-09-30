# Import required modules
express = require('express')
path = require('path')
http = require('http')
mongoose = require('mongoose')
socket = require('socket.io')

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
  # Query the database to see if email is available
  user = UserModel.findOne('email': 's2ahat@gmail.com', (err, user) ->
    if !err
      if user != null
        res.render 'register', emailIsUnavailable: true # found a record, email is in use, re-render the page with error
      else                           # no records in DB, email is available
        user = new UserModel         # create a new model instance
        email: req.body.userEmail    # set email to the email input
        password: req.body.password  # set password to the password input

  # save the model instance to database
  user.save (err)
    if !err # if nothing went wrong save has been successful
      res.redirect '/login' # redirect to the login page

server = http.createServer(app).listen app.get('port'), ->
  console.log 'Express server listening on port ' + app.get('port')

io = socket.listen(server)

io.sockets.on 'connection', (socket) ->
  socket.on 'emailFocusOut', (data) ->
    # wrap into middleware to remove code duplication in here and app.post(/register)
    user = UserModel.findOne('email': data.userEmail, (err, user) ->
      unless err
        if user == null
          socket.emit 'emailFocusOutResponse', 0
        else
          socket.emit 'emailFocusOutResponse', 1


    )
