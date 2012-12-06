$('#registration').validate({
  rules: {
    firstName: {
      required: true,
      maxlength: 15
    },
    lastName: {
      required: true,
      maxlength: 15
    },
    userEmail: {
      required: true,
      email: true
    },
    password: {
      required: true,
      minlength: 6
    },
    confirm: {
      required: true,
      equalTo: '#password'
    },
    newpassword: {
      minlength: 6
    },
    newconfirm: {
      equalTo: '#newpassword'
    },
    ccnumber: {
      creditcard: true
    },
    cv2: {
      maxlength: 4,
      digits: true
    },
    expiration_date: {
      maxlength: 5
    }
  },
  messages: {
    userName: {
      required: "Enter your username"
    },
    firstName: {
      required: "Enter your first name"
    },
    lastName: {
      required: "Enter your last name"
    },
    userEmail: {
      required: "Enter your email address",
      email: "Enter valid email address"
    },
    password: {
      required: "Enter your password",
      minlength: "Password must be minimum 6 characters"
    },
    confirm: {
      required: "Enter confirm password",
      equalTo: "Password and Confirm Password must match"
    },
    newpassword: {
      minlength: "Password must be minimum 6 characters"
    },
    newconfirm: {
      equalTo: "Password and Confirm Password must match"
    },
    ccnumber: {
      required: "Enter a credit card number",
      creditcard: "Enter a valid credit card number"
    },
    cv2: {
      required: "Enter a CV2 number",
      maxlength: "Cannot be greater than 4 digits",
      digits: "Enter a valid CV2 number"
    },
    expiration_date: {
      required: "Enter an expiration date (mm/yy)",
      maxlength: "Cannot be greater than 5 character"
    }

  },
  errorClass: "help-inline",
  errorElement: "span",
  highlight: function (element, errorClass, validClass) {
    $(element)
      .parents('.control-group')
      .addClass('error');
  },
  unhighlight: function (element, errorClass, validClass) {
    $(element)
      .parents('.control-group')
      .removeClass('error');
  }
});

$('#login').validate({
  rules: {
    userName: { required: true },
    password: { required: true }
  },
  messages: {
    userName: {
      required: "Enter your username"
    },
    password: {
      required: "Enter your password"
    }
  },
  errorClass: "help-inline",
  errorElement: "span",
  highlight: function (element, errorClass, validClass) {
    $(element)
      .parents('.control-group')
      .addClass('error');
  },
  unhighlight: function (element, errorClass, validClass) {
    $(element)
      .parents('.control-group')
      .removeClass('error');
  }
});

$('#comment').validate({
  rules: {
    comment: {
      required: true
    }
  },
  messages: {
    comment: {
      required: ""
    }
  },
  errorClass: "help-inline",
  errorElement: "span",
  highlight: function (element, errorClass, validClass) {
    $(element)
      .parents('.control-group')
      .addClass('error');
  },
  unhighlight: function (element, errorClass, validClass) {
    $(element)
      .parents('.control-group')
      .removeClass('error');
  }
});

/**
 * Tags (Interests)
 */

$(function () {
  'use strict';
  $("#interests").tagit({
    allowSpaces: true,
    availableTags: ["Action", "Adventure", "Driving", "Puzzle", "Role-Playing", "Simulation", "Strategy", "Sports"],
    onTagRemoved: function (event, tag) {
      var temp = $(tag).text();
      var myTag = temp.substring(0, temp.length - 1); // exclude x character
      $.post('/account/tag/delete', { removedTag: myTag });
    },
    onTagAdded: function (event, tag) {
      var temp = $(tag).text();
      var myTag = temp.substring(0, temp.length - 1); // exclude x character
      $.post('/account/tag/add', { addedTag: myTag });
    }
  });
});

/**
 * Buying System
 */

$(function () {
  'use strict';
  $.each($('.buy'), function () {

    var id = $(this).attr('id');
    var title = $(this).attr('data-game-title');
    var slug = id.replace('buy-', '');

    $('#' + id).click(function () {
      $('#game-title').text(title);
      $('#modal').modal('show');
      $('#buy-confirm').click(function () {
        humane.log('Your order has been submitted!');
        $('#modal').modal('hide');
        $('#' + id).attr('disabled', 'true');
        $.post('/buy', { slug: slug });
      });
    });
  });
});

/**
 * Rating System
 */
$(function () {
  'use strict';
  $.each($('.stars'), function () {
    var id = $(this).attr('id');
    var slug = id.replace('rating-', '');
    var rating = $(this).attr('data-rating');
    var user = $(this).attr('data-user');
    var voted = $(this).attr('data-voted');
    var suspended = $(this).attr('data-suspended');
    var starBig = $(this).attr('data-star-big');
    var similarGames = $(this).attr('data-similar-games');

    if (starBig === 'Yes') {
      $.fn.raty.defaults.starHalf = 'star-half-big.png';
      $.fn.raty.defaults.starOn = 'star-on-big.png';
      $.fn.raty.defaults.starOff = 'star-off-big.png';
    } else if (similarGames === 'Yes') {
      $.fn.raty.defaults.starHalf = 'star-half.png';
      $.fn.raty.defaults.starOn = 'star-on.png';
      $.fn.raty.defaults.starOff = 'star-off.png';
      $.fn.raty.defaults.space = false;
    }

    if (user) {
      if (suspended === 'Yes') {  // user has been suspended
        $('#' + id).raty({
          path: '/img',
          round : { down: 0.25, full: 0.6, up: 0.76 },
          score: rating,
          readOnly: true
        });
      } else if (voted === 'No') { // user hasn't voted yet
        $('#' + id).raty({
          path: '/img',
          round : { down: 0.25, full: 0.6, up: 0.76 },
          score: rating,
          click: function (score) {
            $.meow({
              message: 'Thanks for voting. Your rating has been submitted.',
              icon: '/img/smiley.png'
            });

            $.ajax({
              type: 'post',
              url: '/rate',
              data: { slug: slug, rating: score },
              success: function (data, status) {
                $('#' + id).raty('readOnly', true);
              }
            });

          }
        });
      } else if (voted === 'Yes') {  // user already voted
        $('#' + id).raty({
          path: '/img',
          round : { down: 0.25, full: 0.6, up: 0.76 },
          score: rating,
          readOnly: true
        });
      }
    } else {  // visitor read-only mode
      $('#' + id).raty({
        path: '/img',
        round : { down: 0.25, full: 0.6, up: 0.76 },
        score: rating,
        readOnly: true
      });
    }
  });
});