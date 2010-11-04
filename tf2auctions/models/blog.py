#!/usr/bin/env python
# -*- coding: utf-8 -*-
from google.appengine.ext import db

from aetycoon import TransformProperty
from tf2auctions.ext.markdown import markdown
from tf2auctions.lib import slugify


class BlogCategory(db.Model):
    name = db.StringProperty(required=True)
    count = db.IntegerProperty(default=0)

    @classmethod
    def build(cls, name):
	cat = cls.get_or_insert(key_name=cat, name=cat)
	return cat


class BlogEntry(db.Model):
    title = db.StringProperty(verbose_name='Title', required=True)
    slug = TransformProperty(title, slugify)
    categories = db.StringListProperty()
    published = db.BooleanProperty()

    created_by = db.UserProperty()
    created_at = db.DateTimeProperty(auto_now_add=True)
    updated_by = db.UserProperty()
    updated_at = db.DateTimeProperty(auto_now=True)

    intro_decoded = db.StringProperty(multiline=True, required=True)
    intro_encoded = TransformProperty(intro_decoded, markdown)

    entry_decoded = db.TextProperty(default='')
    entry_encoded = TransformProperty(entry_decoded, markdown)

    def has_edits(self):
	delta = self.updated_at - self.created_at
	return (delta.days) or (delta.seconds > 60)

    @classmethod
    def read(cls, slug):
	return cls.get_by_key_name(slug)

    @classmethod
    def read_many(cls, limit, offset):
	q = cls.all().order('-created_at')
	return q.fetch(limit+1, offset)

    @classmethod
    def build(cls, title, **kwds):
	cats = []
	for cat in kwds.get('categories', ()):
	    c = BlogCategory.get_or_insert(key_name=cat, name=cat)
	    c.count += 1
	    c.put()
	    cats.append(c.name)

	kwds['categories'] = cats
	entry = cls(key_name=slugify(title), title=title, **kwds)
	entry.put()

	return entry

    @classmethod
    def read_category(cls, category):
	q = cls.all().order('-created_at').filter('categories =', category)
	return q.fetch(100)

    @classmethod
    def recent(cls, limit=10, **kwds):
	q = cls.all().filter('published =', True).order('-created_at')
	return q.fetch(limit)

    def encode_builtin(self):
	up_by, cr_by = self.updated_by, self.created_by
	if up_by:
	    up_by = {'name':up_by.nickname, 'email':up_by.email}
	if cr_by:
	    cr_by = {'name':cr_by.nickname, 'email':cr_by.email}
	return {
	    'title':self.title,
	    'id':self.slug,
	    'categories':self.categories,
	    'created_by':cr_by,
	    'created_at':str(self.created_at),
	    'updated_by':up_by,
	    'updated_at':str(self.updated_at),
	    'intro':self.intro_encoded,
	    'entry':self.entry_encoded,
	}
