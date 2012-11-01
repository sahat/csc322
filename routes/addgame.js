var db = require('../db');
var request = require('request');
var jsdom = require('jsdom');
var fs = require('fs');

exports.get = function (req, res) {

  // only admin should be able to view Add Game page
  if (!req.session.user || req.session.user.isAdmin === false) {
    res.redirect('/');
  }

  res.render('add');
};

exports.post = function (req, res) {

  // create a client request to amazon.com
  request({ uri: req.body.gameURL }, function (err, response, body) {
    if (err && response.statusCode !== 200) {
      return;
    }

    // using jQuery to extract DOM information from Amazon.com
    jsdom.env({ html: body, scripts: ['http://code.jquery.com/jquery-1.6.min.js'] }, function (err, window) {
      var $ = window.jQuery;

      // title
      var title = $('#btAsinTitle').html();
      console.log($('#btAsinTitle').html());

      // price
      var price = $('#listPriceValue').html() || $('#actualPriceValue').text() ;
      console.log(price);


      // helper function to create a slug (e.g. Mass Effect 2 --> mass-effect-2)
      function slugify(text) {
        text = text.replace(/[^-a-zA-Z0-9\s]+/ig, '');
        text = text.replace(/-/gi, '_');
        text = text.replace(/\s/gi, '-');
        text = text.toLowerCase();
        return text;
      }

      // slug
      var slug = slugify(title).replace('amp', 'and');
      console.log(slug);

      // long game summary with screenshots
      if (!$('.productDescriptionWrapper .aplus').html()) {
        console.log('no aplus class');
        var summary = $('.productDescriptionWrapper').html();
      }
      // depending on the game, DOM might be structured differently on Amazon.com
      else {
        console.log('using aplus class');
        var summary = $('.productDescriptionWrapper .aplus').html();
      }

      // creating a new client request to Gamespot.com using sluggified title from Amazon.com
      request({uri: 'http://www.gamespot.com/' + slug + '/platform/pc/'}, function (err, response, body) {
        if (err && response.statusCode !== 200) return;
        jsdom.env({ html: body, scripts: ['http://code.jquery.com/jquery-1.6.min.js'] }, function (err, window) {
          var $ = window.jQuery;

          // short description
          var description = $('.productDeck .mainDeck').text();
          console.log(description);

          // genre
          var genre = $('.genre .data').text();
          console.log(genre);

          // publisher
          var publisher = $('.publisher .data').text();
          console.log(publisher);

          // release date
          var temp = $('.date .data').text();
          var releaseDate = temp.replace('  (US) »', '');
          console.log(releaseDate);
          console.log(Date.parse(releaseDate));

          // thumbnail image
          var thumbnail = $('.boxshot a img').attr('src');
          request(thumbnail).pipe(fs.createWriteStream('./public/img/games/' + slug + '-thumb.jpg'));
          var thumbnail = slug + '-thumb.jpg';
          console.log(thumbnail);

          // large cover for the game
          // I used a regular expression 'replace' to replace thumb with front to match valid Gamespot URL
          var tempLarge = $('.boxshot a img').attr('src');
          var largeImage = tempLarge.replace('thumb', 'front');
          request(largeImage).pipe(fs.createWriteStream('./public/img/games/' + slug + '-large.jpg'));
          console.log(largeImage);
          var largeImage = slug + '-large.jpg';

          // game is a Schema object containing parsed information
          var game = new db.Game({
            title: title,
            slug: slug,
            publisher: publisher,
            thumbnail: thumbnail,
            largeImage: largeImage,
            genre: genre,
            price: price,
            summary: summary,
            description: description,
            releaseDate: releaseDate
          });

          // Prevents adding the same game twice
          db.Game.findOne({ 'slug': slug }, function (err, game) {
            if (game) {
              res.send(500, 'Halt: Games already exists');
            }
          });

          // Save game object into database as a document of db.games collection
          game.save(function(err) {
            if (err) {
              console.log(err);
              res.send(500, 'Unable to add the game to database');
            }
            console.log('Added game to MongoDB');
            res.redirect('/add');
          });
        });
      });
    });
  });
};