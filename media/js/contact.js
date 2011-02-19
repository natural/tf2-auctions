oo.config('#contact-')

var submitFeedback = function() {
    var feedback = {
	email: oo('email').val(),
	id64: oo('id64').val(),
	name: oo('name').val(),
	msg: oo('message').val().slice(0, 2048)
    }
    var done = function() {
	oo('form').slideUp()
	oo('complete').slideDown()
    }
    $.ajax({
	url: '/api/v1/public/send-feedback',
	type: 'POST',
	dataType:'json',
	data: $.toJSON(feedback),
	success: done,
	error: done
    })
}


var userAuthOkay = function(profile) {
    oo('id64').val(profile.steamid)
    oo('name').val(profile.personaname)
    oo('content-pod').slideDown()
}


var userAuthError = function(request, status, error) {
    oo('content-pod').slideDown()
}




$(document).ready(function() {
    oo('form-submit').click(submitFeedback)
    oo.data.auth({success: userAuthOkay, error: userAuthError})
})
