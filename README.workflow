Listing Workflows
-----------------

Goal:

    The goal is to change the current workflows to support more
    intuitive, more obvious status and operations.  The obstacles to
    this goal are:

    1.  the long (24 hour) delay between 'ended' and 'expired' states
    2.  the unclear distinction between 'ended' and 'expired' states
    3.  the inability to complete an auction successfully before the
        system ends it

    One appealing approach is to combine the 'ended' and 'expired'
    states, thus removing these two obstacles.  To support this, and
    to support automatic verification of item movement, an additional
    state must be introduced: 'verified'.  Also, to avoid clashes
    between new workflows and old, the completed state must have a
    different name, 'finshed'.  The normal workflow lines then become:

    1.  active -> finished
    2.  active -> finished -> verified
    3.  active -> cancelled (by client)
    4.  active -> cancelled (by system - invalid items)


Client Add Listing (Old and New)
================================

    1.  The client makes new listing via the UI at /listing/add

        a.  POST to /api/v1/auth/add-listing

    2.  The add-listing script calls the Listing.build class method to
        create datastore object

        a.  Listing.build sets status attribute indirectly using
            default ('active')

        b.  Listing.build places new listing key into end_listing and
            reverify_items queues

    3.  Final status:  'active'


Client Cancel Listing (Old and New)
===================================

    1.  The client cancels active listing via ui at /listing/<listing-id>

        a.  POST to /api/v1/auth/cancel-listing

    2.  The cancel-lisitng script calls listing instance cancel()

        a.  cancel() sets status to 'cancelled' if and only if current
            status is 'active'

        b.  cancel() sets listing items and bid item status to
            'cancelled'

    3.  Final status: 'cancelled' or unchanged


System End Listing
==================

    1.  The system calls /api/v1/admin/queue/end-listing

    2.  The end-listing script calls listing instance end()

        a. end() sets status to 'ended' if and only if current status is 'active'

        b. if bids exist on listing instance, listing is added to
           expire_listing queue.

        c.  listing items and bid items status is not changed (are not
            released). (now fixed -- all items released)

        NB: change this to stop create bid/listing errors.

    3.  Final status: 'ended' or unchanged


System Verify Listing Items
===========================

    1.  The system calls /api/v1/admin/queue/reverify-items

    2.  If listing items have moved, the reverify-items script calls
        listing instance cancel()

        a.  cancel() sets listing items and bid item status to 'cancelled'

    3.  Final status: 'cancelled' or unchanged


System Expire Listing
=====================

    1.  The system calls /api/v1/admin/queue/expire-listing

    2.  The expire-listing script calls listing instance expire()

        a.  expire() sets status to 'expired' if and only if current
            status is 'ended'

        b. listing items and bid items are set to 'expired'


    3.  Final status: 'expired' or unchanged


Bid Workflows
-------------

Client Add Bid
==============

    1.  The client makes a new bid via the UI at /listing/<listing-id>

        a.  POST to /api/v1/auth/add-bid

    2.  The add-bid script calls the class method Bid.build

        a.  Bid.build sets status attribute via default, which is 'active'

        b.  Bid.build places new bid key into reverify_items queue


Client Update Bid
=================

    1.  The client modifies (adds to) their bid via the UI at /listing/<listing-id>

        a.  POST to /api/v1/auth/add-bid

    2.  The add-bid script calls the class method Bid.build_update

        a.  Bid.build_update does not change bid status

        b.  Bid.build_update does not place bid items into the reverify_items queue


Client Cancel Bid
=================

    1.  The client modifies (adds to) their bid via the UI at /listing/<listing-id>

        a.  POST to /api/v1/auth/cancel-bid

    2.  The cancel-bid script calls bid instance cancel()

        a.  The bid instance cancel method removes the bid items from
            the datatstore by calling the delete() method on each

        b.  The bid instance cancel method calls the bid instance
            delete() method to remove itself from the datastore
