#!/usr/bin/env python
# -*- coding: utf-8 -*-
from google.appengine.ext import db


class Feedback(db.Model):
    """ Feedback -> a record of one users rating of another.

    """
    source = db.UserProperty('Source user (the one rating)', required=True)
    target = db.UserProperty('Target user (the one rated)', required=True)
    rating = db.RatingProperty('Rating', required=True)
    comment = db.StringProperty('Comment', multiline=True)
    as_bidder = db.BooleanProperty('Rating user as a bidder', required=True)
    as_lister = db.BooleanProperty('Rating user as a lister', required=True)
