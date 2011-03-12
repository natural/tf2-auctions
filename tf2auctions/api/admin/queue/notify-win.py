#!/usr/bin/env python
# -*- coding: utf-8 -*-
from logging import warn

from google.appengine.api import mail

from tf2auctions.lib import ApiHandler
from tf2auctions.models import Bid
from tf2auctions.models.settings import PlayerSettings

## TODO: send mail function, and email template are candiates for
## refactoring.

body_template = """
Hello %(name)s,

You won!

The bid you placed on this listing was selected as the winner:

    %(url)s

Go meet up with the lister and trade your stuff for their stuff!


------

This is an automated email.  It was sent to you because you specified
in your profile that you wanted email notifications when your listings
got new bids.  If you don't like it, go to TF2Auctions.com, log in,
and change your settings.

"""

def send(name, email, id64, url):
    mail.send_mail(
	sender='TF2Auctions.com Notification Bot <support@tf2auctions.com>',
	to=email,
	subject='Your Bid Won on TF2Auctions.com',
        body=body_template % locals(),
    )


class NotifyWin(ApiHandler):
    def post(self):
	try:
	    key = self.request.get('bid')
	    warn('notify win: %s', key)
	    bid = Bid.get(key)
	    profile = bid.owner_profile()
	    settings = PlayerSettings.get_by_id64(bid.owner).encode_builtin(complete=True)
	    if settings['email'] and settings['notify-wins']:
		name = getattr(profile, 'personaname', bid.owner)
		send(name, settings['email'], bid.owner, bid.listing.url())
	except (Exception, ), exc:
	    warn('notify win exception: %s', exc)
	    self.response.out.write('WARN')
	else:
	    self.response.out.write('OK')


main = ApiHandler.make_main(NotifyWin)


if __name__ == '__main__':
    main()
