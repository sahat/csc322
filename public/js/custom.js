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

$(document).ready(function() {

  var counter = 0;

  $('#recommendation').tokenInput("http://localhost:3000/api/games", {
    preventDuplicates: true,
    propertyToSearch: 'title',

    onAdd: function (item) {
      counter++;

      if (counter == 1) {
        $.meow({
          message: 'Thanks! We just need 2 more interests.'
        });
      }

      if (counter == 2) {
        $.meow({
          message: 'Alright! Just need 1 more interest.'
        });
      }

      if (counter == 3) {
        $.meow({
          message: 'Great job! That\'s all we need. Feel free to add more items if you wish to do so!'
        });
      }
    }
  });
});

$(document).ready(function() {
  $("button[type=submit]").click(function () {
    var selected = $('#recommendation').tokenInput('get');
    console.log(selected);
  });
});
