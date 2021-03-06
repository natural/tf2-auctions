#!/usr/bin/env python
# -*- coding: utf-8 -*-
from datetime import datetime, timedelta
from logging import error, info, warn

from google.appengine.api import taskqueue

from tf2auctions import features
from tf2auctions.lib import ApiHandler, user_steam_id
from tf2auctions.models import Listing, Bid
from tf2auctions.models.profile import PlayerProfile


class ReverifyItems(ApiHandler):
    """ ReverifyItems -> checks listing and bid item ownership and
        cancels the listing or bid if the ownership changes.

	This class supports two modes: the initial mode, called
	'init', is used by the Listing and Bid models to start the
	reverification timer.  The second mode, called 'verify', is
	the actual reverification process.

    """
    def post(self):
	""" Called by the task queue API when a this task is ready to
	    run.  The tasks are created by the Listing and Bid models.
	"""
	get = self.request.get
	try:
	    vtype, action, key = get('type'), get('action'), get('key')
	    info('re-verify items: %s %s %s', action, vtype, key)
	    call = getattr(self, '%s_%s' % (action, vtype), None)
	    if call is None:
		raise TypeError('Invalid reverify type and action: %s_%s' % (action, vtype))
	    call(key)
	except (Exception, ), exc:
	    error('re-verify exception: %r', exc)

    def init_listing(self, key):
	""" Initialize listing items reverification by sending it back
	    into this queue.
	"""
	self.requeue(Listing, key, lambda v:v.expires)

    def init_bid(self, key):
	""" Initialize bid items reverification by sending it back
	    into this queue.
	"""
	self.requeue(Bid, key, lambda v:v.listing.expires)

    def verify_listing(self, key):
	""" Verify listing items and possibly requeue the verification.

	"""
	self.init_listing(self.reverify(Listing, key))

    def verify_bid(self, key):
	""" Verify bid items and possibly requeue the verification.

	"""
	self.init_bid(self.reverify(Bid, key))

    def requeue(self, cls, key, get_expires):
	""" If there is time left on a listing or bid, this method
	    will submit a new item to the task queue to run in one day
	    (one minute in devel).
	"""
	if not key:
	    return
	kind = cls.__name__.lower()
	if isinstance(key, (basestring, )):
	    obj = cls.get(key)
	else:
	    obj = key
	    key = str(obj.key())
	if not obj:
	    warn('re-verify invalid %s: %s', kind, key)
	    return
	if obj.status != 'active':
	    warn('re-verify not active %s: %s', kind, key)
	    return
	expires = get_expires(obj)
	now = datetime.now()
	if expires <= now:
	    warn('re-verify already expired %s: %s', kind, key)
	    return
	if features.devel:
	    count = (expires - now).seconds / 60
	    eta_call = lambda v: now + timedelta(minutes=v)
	else:
	    count = (expires - now).days
	    eta_call = lambda v: now + timedelta(days=v)
	count = min(count, 29) # just in case
	info('re-verify resubmit task %s: %s (%s:%s)', kind, key, count, count>1)
	if count > 1:
	    params = {'key':key, 'action':'verify', 'type':kind}
	    taskqueue.add(
		url='/api/v1/admin/queue/reverify-items',
		queue_name='item-verification',
		eta=eta_call(1),
		params=params)

    def reverify(self, cls, key):
	""" Verify item ownership against the owner's backpack.

	This method will return the object if ownership is correct,
	otherwise it will cancel the listing or bid.
	"""
	kind = cls.__name__.lower()
	obj = cls.get(key)
	info('re-verify items in %s: %s', kind, key)
	items = obj.items()
	profile = PlayerProfile.get_by_user(user_steam_id(obj.owner))
	profile.refresh()
	#warn('re-verify items: %s', [long(i.uniqueid) for i in items])
	if profile.owns_all([long(i.uniqueid) for i in items]):
	    return obj
	else:
	    obj.cancel('Item ownership changed (%s)' % (kind, ))


main = ApiHandler.make_main(ReverifyItems)


if __name__ == '__main__':
    main()
