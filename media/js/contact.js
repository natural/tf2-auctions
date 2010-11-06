var $$ = function(suffix, next) { return $('#contact-'+suffix, next) }


var submitFeedback = function() {
    var feedback = {
	email: $$('email').val(),
	id64: $$('id64').val(),
	name: $$('name').val(),
	msg: $$('message').val().slice(0, 400)
    }
    var done = function() {
	$$('form').slideUp()
	$$('complete').slideDown()
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
    defaultUserAuthOkay(profile)
    $$('id64').val(profile.steamid)
    $$('name').val(profile.personaname)
    $$('content-pod').slideDown()
}


var userAuthError = function(request, status, error) {
    $$('content-pod').slideDown()
}




$(document).ready(function() {
    $$('form-submit').click(submitFeedback)
    new AuthProfileLoader({success: userAuthOkay, error: userAuthError})
})
