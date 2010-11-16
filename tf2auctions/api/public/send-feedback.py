#!/usr/bin/env python
# -*- coding: utf-8 -*-
from google.appengine.api import mail
from tf2auctions.lib import ApiHandler


body_template = """
Name: %(name)s
Email: %(email)s
Steam ID: %(id64)s

Message:

%(message)s

"""


def send(name, email, id64, message):
    mail.send_mail(
	sender='TF2Auctions.com Support <support@tf2auctions.com>',
	to='TF2Auctions.com Support <support@tf2auctions.com>',
	subject='Message from Site Visitor',
        body=body_template % locals(),
    )


class SendFeedback(ApiHandler):
    def post(self):
	data = self.body_json()
	msg = data.get('msg')
	if msg:
	    send(data.get('name'),
		 data.get('email'),
		 data.get('id64'),
		 msg[0:2048])
	self.write_json({})


main = ApiHandler.make_main(SendFeedback)


if __name__ == '__main__':
    main()
