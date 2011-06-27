#!/usr/bin/env python
import cookielib
import email
import imaplib
import json
import logging
import os
import re
import time
import urllib
import urllib2


logging.basicConfig(level=logging.DEBUG)


debug = False
quality_prefix = {3: 'v. ', 5: 'Unusual ', 1: 'g. ', 11:'Strange '}
reddit_session_key = 'reddit_session'
reddit_user_agent = 'tf2auctions bot'


class urls:
    base = 'http://www.reddit.com/'
    mod = base + 'help'
    login = base + 'api/login/.json'
    submit = base + 'api/submit/.json'
    schema = 'http://tf2apiproxy.appspot.com/api/v2/public/schema'
    if debug:
        listing_detail = 'http://localhost:8080/api/v1/public/listing/'
    else:
        listing_detail = 'http://www.tf2auctions.com/api/v1/public/listing/'


def read_creds(fname):
    curdir = os.path.abspath(os.path.dirname(__file__))
    fh = open(os.path.join(curdir, '..', fname))
    user, passwd = fh.readline().split(':')
    return (user, passwd)


def schema_items():
    schema = json.loads(urllib2.urlopen(urls.schema).read())
    logging.info('loaded tf2 items schema')
    return dict((i['defindex'], i) for i in schema['result']['items']['item'])


def open_imap(username, password, host='imap.gmail.com', port=993):
    con = imaplib.IMAP4_SSL(host, port)
    con.login(username, password)
    logging.info('connected to imap server at %s:%s', host, port)
    return con


def close_imap(con):
    con.close()
    con.logout()
    logging.info('closed imap connection')


def reddit_listing_title(lst, schemamap):
    title_fs, have, want = '[H] %s [W] %s', [], []
    items = lst['items']

    ## compute the "have".  note that this is slightly wrong when
    ## determines quantity in that quality is not considered.
    item_counts = {}
    for item in items:
        i = item['defindex']
        item_counts[i] = 1 + item_counts.setdefault(i, 0)
    item_seen = {}
    for item in items:
        i = item['defindex']
        if item_counts[i] == 1:
            suffix = ''
        elif i in item_seen:
            continue
        else:
            item_seen[i] = True
            suffix = ' x%s' % item_counts[i]
        prefix = quality_prefix.get(item['quality'], '')
        name = schemamap[i]['item_name']
        have.append('%s%s%s' % (prefix, name, suffix))

    ## compute the "want"
    if lst['bid_currency_use']:
        want = [u'%s %s' % lst['bid_currency_type'], lst['bid_currency_start']]
    else:
        item_counts = {}
        for i in lst['min_bid']:
            item_counts[i] = 1 + item_counts.setdefault(i, 0)
        item_seen = {}
        for i in lst['min_bid']:
            if item_counts[i] == 1:
                suffix = ''
            elif i in item_seen:
                continue
            else:
                item_seen[i] = True
                suffix = ' x%s' % item_counts[i]
            name = schemamap[i]['item_name']
            want.append('%s%s' % (name, suffix))
    if not want:
        want = ['Offers']

    title = title_fs % ( ', '.join(have), ', '.join(want))
    if len(title) > 300:
        title = title[0:297] + '...'
    return title


def reddit_headers(user_agent=reddit_user_agent, **kwds):
    h = {'User-agent':user_agent}
    if 'session_id' in kwds:
        h['Cookie'] = '%s=%s;' % (reddit_session_key, kwds.pop('session_id'))
    h.update(kwds)
    return h


def reddit_login(user, passwd):
    data = urllib.urlencode({'user':user, 'passwd':passwd})
    req = urllib2.Request(urls.login, data=data, headers=reddit_headers())
    logging.info('opening reddit login request')
    return urllib2.urlopen(req)


def reddit_session_value(req):
    cookies = req.headers['set-cookie']
    session = dict(cookielib.parse_ns_headers([cookies])[0])[reddit_session_key]
    logging.info('have reddit session id/key/value: %s', session)
    return session


def reddit_auth(user, passwd):
    session_id = reddit_session_value(reddit_login(user, passwd))
    time.sleep(1)
    mod_req = urllib2.Request(urls.mod, headers=reddit_headers(session_id=session_id))
    logging.info('opening reddit page for mod hash')
    match = re.search(r'modhash[^,]*', urllib2.urlopen(mod_req).read(1200))
    return session_id, match.group(0).split(': ')[1].strip(" '")


def reddit_post(user, passwd, url, title, subreddit='tf2auctions'):
    session_id, mod_hash = reddit_auth(user, passwd)
    logging.info('reddit session=%s, hash=%s', session_id, mod_hash)
    data = {
        'kind':'link',
        'uh':mod_hash,
        'url':url,
        'sr':subreddit,
        'title':title,
    }
    hdr = reddit_headers(session_id=session_id)
    time.sleep(1)
    req = urllib2.Request(urls.submit, headers=hdr, data=urllib.urlencode(data))
    return urllib2.urlopen(req)


def new_messages_from_label(m, label):
    m.select(label)
    typ, data = m.search(None, 'UnSeen')
    for num in data[0].split():
        typ, data = m.fetch(num, '(RFC822)')
        yield email.message_from_string(data[0][1])
    close_imap(m)


def fetch_listing_details(listing_id):
    data = urllib.urlopen(urls.listing_detail + str(listing_id))
    return json.loads(data.read())


def main():
    u, p = read_creds('support_imap_creds.nodist')
    m = open_imap(u, p)
    msgs = new_messages_from_label(m, 'crosspost')

    schemamap = schema_items()
    user, passwd = read_creds('reddit_cred.nodist')

    for msg in msgs:
        if debug:
            listing_summary = json.loads(msg.get_payload(0).get_payload())
        else:
            listing_summary = json.loads(msg.get_payload())
        listing_details = fetch_listing_details(listing_summary['listing']['id'])
        logging.info('have listing details: %s', listing_details)
        ## IMPORTANT: skip if not active!
        title = reddit_listing_title(listing_details, schemamap)
        logging.info('computed title: %s', title)
        try:
            url = 'http://www.tf2auctions.com/listing/%s' % (listing_summary['listing']['id'])
            reddit_post(user, passwd, url, title)
            logging.info('post to reddit url=%s, title=%s', url, title)
        except (Exception, ), exc:
            logging.error('error in reddit post %s', exc)


if __name__ == '__main__':
    main()
