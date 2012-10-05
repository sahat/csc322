$('#registration').validate({
  rules: {
    firstName: { required: true },
    lastName: { required: true},
    userEmail: { required: true, email: true },
    password: { required: true, minlength: 6 },
    confirm: { required: true, equalTo: '#password' }
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

