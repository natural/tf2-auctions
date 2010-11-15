#!/usr/bin/env python
# -*- coding: utf-8 -*-
from logging import warn

from google.appengine.api import mail

from tf2auctions.lib import ApiHandler
from tf2auctions.models import Bid
from tf2auctions.models.settings import PlayerSettings


body_template = """
Hello %(name)s,

Someone has added a bid to your listing!  See it here:

%(url)s

------

This is an automated email.  It was sent to you because you specified
in your profile that you wanted email notifications when your listings
got new bids.  If you don't like it, go to TF2Auctions.com, log in,
and change your settings.

"""

def send(name, email, id64, url):
    mail.send_mail(
	sender='TF2Auctions.com Notification Bot <support@tf2auctions.com>',
	to='TF2Auctions.com Notification Bot <support@tf2auctions.com>',
	subject='New Bid for Your Listing on TF2Auctions.com',
        body=body_template % locals(),
    )


class NotifyBid(ApiHandler):
    def post(self):
	try:
	    key = self.request.get('bid')
	    update = self.request.get('update')
	    warn('notify bid: %s, %s', key, update)
	    bid = Bid.get(key)
	    listing = bid.listing
	    profile = listing.owner_profile()
	    settings = PlayerSettings.get_by_id64(listing.owner).encode_builtin(complete=True)
	    if settings['email'] and settings['notify-bids']:
		name = getattr(profile, 'personaname', listing.owner)
		email = settings['email']
		url = 'http://www.tf2auctions.com/listing/%s' % (listing.key().id, )
		send(name, email, listing.owner, url)

	except (Exception, ), exc:
	    warn('notify bid exception: %s', exc)
	    self.response.out.write('WARN')
	else:
	    self.response.out.write('OK')


main = ApiHandler.make_main(NotifyBid)


if __name__ == '__main__':
    main()
