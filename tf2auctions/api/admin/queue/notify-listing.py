#!/usr/bin/env python
# -*- coding: utf-8 -*-
from logging import warn

from google.appengine.api import mail
from google.appengine.ext import db

from tf2auctions.lib import ApiHandler
from tf2auctions.models import Listing
from tf2auctions.models.subscriber import Subscription
from tf2auctions.models.utils import add_filters, queue_tool


body_template = """
Hello,

Someone has added a listing that interests you!  See it here:

%(url)s

------

This is an automated email.  It was sent to you because you specified
in your profile that you wanted email notifications when new listings
that match your preferences are created.  If you don't like it, go to
TF2Auctions.com, log in, and change your settings.

"""

def send(email, url):
    mail.send_mail(
	sender='TF2Auctions.com Notification Bot <support@tf2auctions.com>',
	to=email,
	subject='New Interesting Listing on TF2Auctions.com',
        body=body_template % locals(),
    )


class NotifyListing(ApiHandler):
    def post(self):
	next = None
	bookmark = self.request.get('subscription_key')

	q = Subscription.all().order('__key__').filter('status =', 'Verified')
	if bookmark:
	    q.filter('__key__ >', db.Key(bookmark))
	warn('q: %s, bookmark: %s %s', q, bookmark, type(bookmark))
	subscription = q.get()

	## 0. done if there are no more subscriptions
	if not subscription:
	    warn('all subscriptions notified')
	    return

	## 1. otherwise, process this subscription via its settings:
	listing_key = self.request.get('listing_key')
	listing = Listing.get(listing_key)
	settings = subscription.settings
	if settings.email and settings.notify_listing_defs:
	    items = [i.defindex for i in listing.items()]
	    for defindex in items:
		warn('DEF: %s/%s, ITEMS: %s/%s', defindex, type(defindex), items, [type(i) for i in items])
		if defindex in settings.notify_listing_defs:
		    ## no name, that would mean yet another datastore read...
		    send(settings.email, listing.url())
		    warn('NEW notification for subscription: %s', subscription)
		    break

	## 2.  add another item to the queue:
	queue_tool.notify_listing(subscription_key=subscription.key(),
				  listing_key=listing_key)
	warn('ADD new query for subscription notification: %s', listing_key)


main = ApiHandler.make_main(NotifyListing)


if __name__ == '__main__':
    main()
