$('#registration').validate({
  rules: {
    firstName: {
      required: true
    },
    lastName: {
      required: true
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
    userEmail: { required: true, email: true },
    password: { required: true }
  },
  messages: {
    userEmail: {
      required: "Enter your email address",
      email: "Enter valid email address"
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

$('#star').raty({
  score: 4
});
$('#myModal').modal();
// grawl notification and send email when purchased
$('#b2').click(function() {
  var game = this;
  $(game).removeClass('btn-primary').text('Confirm Purchase').addClass('btn-success');
  $(game).unbind('click');
  $(game).click(function() {
    $.ajax({
      type: 'POST',
      url: '/buy',
      data: {
        title: 'Borderlands 2'
      }
    }).done(function() {
        $(game).attr('disabled', 'true');
        $(game).removeClass('btn-success').html('<i class="icon-shopping-cart icon-white"></i> Purchased').addClass('btn-primary disabled');
        window.location.href = '/';
      });

  });
});

