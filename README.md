![Node](http://upload.wikimedia.org/wikipedia/en/a/a7/Nodejs_logo_light.png)
![Mongo](http://www.mongodb.org/download/attachments/132305/logo-mongodb-onwhite.png)
![Redis](http://redis.io/images/redis-300dpi.png)

How to use
==========

**Live Demo**: (http://csc322.heroku.com)

**Local Demo**:

1. Install Node.js 0.8.x and MongoDB 2.x.
2. Inside project folder type `npm install`
3. Run `node server.js` command
4. Open the browser at the following URL: `http://localhost:3000`

*Note*: Local demo still requires an internet connect because our game database is located on **mongolab.com**.

To access admin dashboard use the following account:

- `username: syalkabov762`
- `password: password`

Project Structure
=================

- **server.js** - main file that contains application logic, routes, database schema.
- **views/jade files** - view templates (sort of like HTML files)
- **public/css** - stylesheets folder
- **public/img** - images folder
- **public/js** - javascripts folder
- **screenshots** - screenshots of the web application


Infrastructure
==============
1. **node.js** - application server
2. **express** - web framework for node.js
3. **mongoose** - mongodb object document mapper
4. **bcrypt** - cryptography library
5. **redis-store** - storing sessions in redis database
6. **request** - used for initiating requests to parse the website
7. **jsdom** - used to parse a website
8. **underscore.js** - utility functions for javascript
9. **underscore.strin** - utility functions for javaScript strings
10. **emailjs** = sends e-mail via a designated SMTP server

Tools
=====
1. JetBrains IntelliJ IDEA 12
2. GitHub

Design and Front-end
======================
1. **Bootstrap** - css framework by Twitter (http://twiter.github.com/bootstrap)
2. **Jade** - server-side templating language (http://jade-lang.com)
4. **Credit Card Icons** - (http://www.smashingmagazine.com/2010/10/21/free-png-credit-card-debit-card-and-payment-icons-set-18-icons/)
5. **jQuery Raty** - star ratings (http://wbotelhos.com/raty)
6. **Game information** - parsed from Gamespot.com and Amazon.com
7. **jquery.validate** - client-side input validation (http://bassistance.de/jquery-plugins/jquery-plugin-validation)
8. **jquery.meow** - javascript notifications when rating a game (http://zacstewart.com/projects/meow.html)
9. **humane.js** - javascript notifications when buying a game (http://wavded.github.com/humane-js)


Screenshots
===========

Input validation on client-side and server-side
---

![Registration](https://raw.github.com/sahat/csc322/master/screenshots/register.png)

Nice alert message on login screen if registration has been successful
---

![Registration Successful](https://raw.github.com/sahat/csc322/master/screenshots/registration_successful.png)

Profile view. Note the sahat@msn.com | Sign Out links instead of Login | Create Account
---

![Profile](https://raw.github.com/sahat/csc322/master/screenshots/profile.png)

Game ratings retrieved from the database and displayed next to the game title
---

![Rating](https://raw.github.com/sahat/csc322/master/screenshots/ratings.png)

Xbox Live Achievements and User information for those who have a Gamertag
----

![Xboxlive](https://raw.github.com/sahat/csc322/master/screenshots/xbox-live.png)

Recommendation Engine for registered users
--------
![recommendation](https://raw.github.com/sahat/csc322/master/screenshots/top6.png)
