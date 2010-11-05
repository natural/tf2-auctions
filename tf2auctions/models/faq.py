#!/usr/bin/env python
# -*- coding: utf-8 -*-
from google.appengine.ext import db
from aetycoon import TransformProperty
from tf2auctions.ext.markdown import markdown


def get_all(category_limit=100, entry_limit=100):
    category_entries = []
    for category in FaqCategory.all().order('relative_order').fetch(category_limit):
	entries = category.faqentry_set.order('relative_order').fetch(entry_limit)
	category_entries.append((category, entries))
    return category_entries


def get_all_decoded(category_limit=100, entry_limit=100):
    def inner():
	for cat, entries in get_all(category_limit, entry_limit):
	    yield (cat.encode_builtin(), [e.encode_builtin() for e in entries])
    return list(inner())


class FaqCategory(db.Model):
    created = db.DateTimeProperty('Created', required=True, auto_now_add=True)
    relative_order = db.IntegerProperty('Relative Sort Order', required=True, default=0)

    @classmethod
    def build(cls, name, relative_order=0):
	return cls.get_or_insert(name, relative_order=relative_order)

    def encode_builtin(self):
	return {'name' : self.key().name(), }


class FaqEntry(db.Model):
    created = db.DateTimeProperty('Created', required=True, auto_now_add=True)
    relative_order = db.IntegerProperty('Relative Sort Order', required=True, default=0)
    category = db.ReferenceProperty(FaqCategory, 'Category', required=True)

    title = db.StringProperty(required=True)
    entry_decoded = db.TextProperty(default='')
    entry_encoded = TransformProperty(entry_decoded, markdown)


    @classmethod
    def build(cls, title, entry, category, relative_order=0):
	cat = FaqCategory.build(category) if isinstance(category, (basestring, )) else category
	obj = cls(title=title, entry_decoded=entry, category=cat, relative_order=relative_order)
	obj.put()
	return obj

    def encode_builtin(self):
	return {'title' : self.title, 'entry' : self.entry_encoded}
