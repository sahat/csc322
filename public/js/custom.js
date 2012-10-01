$('#registration').validate({
  rules: {
    userEmail: { required: true, email: true },
    password: { required: true, minlength: 6 },
    confirm: { required: true, equalTo: '#password' }
  },
  messages: {
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
      required: "Enter your password",
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

/*
var socket = io.connect('http://localhost');
// fire an event to the server
$('#userEmail').focusout(function() {
  var value = $('#userEmail').val();
  socket.emit('emailFocusOut', { userEmail: value });
});
// listen for event from the server
socket.on('emailFocusOutResponse', function (data) {
  if (data === 0)
    console.log("Email available")
  else {
    $('#userEmail').parents('.control-group').addClass('error');)
  }
});
*/