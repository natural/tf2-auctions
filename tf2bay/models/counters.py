#!/usr/bin/env python
# -*- coding: utf-8 -*-
from google.appengine.api import memcache
from google.appengine.ext import db
import random

## copied from http://code.google.com/appengine/articles/sharding_counters.html


class CounterConfig(db.Model):
    """ Tracks the number of shards for each named counter. """
    name = db.StringProperty(required=True)
    num_shards = db.IntegerProperty(required=True, default=20)


class Counter(db.Model):
    """ Shards for each named counter. """
    name = db.StringProperty(required=True)
    count = db.IntegerProperty(required=True, default=0)


def get_count(name):
    """ Retrieve the value for a given sharded counter. """
    total = memcache.get(name)
    if total is None:
        total = 0
        for counter in Counter.all().filter('name = ', name):
            total += counter.count
        memcache.add(name, str(total), 60)
    return total


def increment(name):
    """ Increment the value for a given sharded counter. """
    config = CounterConfig.get_or_insert(name, name=name)
    def txn():
        index = random.randint(0, config.num_shards - 1)
        shard_name = name + str(index)
        counter = Counter.get_by_key_name(shard_name)
        if counter is None:
            counter = Counter(key_name=shard_name, name=name)
        counter.count += 1
        counter.put()
    db.run_in_transaction(txn)
    memcache.incr(name)


def increase_shards(name, num):
    """ Increase the number of shards for a given sharded counter. """
    config = CounterConfig.get_or_insert(name, name=name)
    def txn():
        if config.num_shards < num:
            config.num_shards = num
            config.put()
    db.run_in_transaction(txn)
