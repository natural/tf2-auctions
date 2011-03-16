#!/usr/bin/env python
##
# and now for something completely different

from urllib import urlopen, urlencode
from tf2auctions.ext.markdown import markdown
from tf2auctions.lib import json_dumps, json_loads


def read_api_token():
    import os, tf2auctions
    p = os.path.join(tf2auctions.features.app_dir, 'github_token.nodist')
    return open(p).readline().strip()


class GitHubApi(object):
    base_url = 'http://github.com/api/v2/json/'
    repo = 'tf2-auctions'
    user = 'natural'
    _token = None

    @property
    def token(self):
        t = self._token
        if not t:
            t = self._token = read_api_token()
        return t


class GitHubRepo(GitHubApi):
    feature_url = 'repos/%s/%s/%s'

    def make_url(self, what):
        return self.base_url + self.feature_url % (what, self.user, self.repo)

    def tags(self):
        url = self.make_url('show') + '/tags'
        return json_loads(urlopen(url).read())

    def branches(self):
        url = self.make_url('show') + '/branches'
        return json_loads(urlopen(url).read())


class GitHubIssues(GitHubApi):
    feature_url = 'issues/%s/%s/%s'

    def make_url(self, what):
        return self.base_url + self.feature_url % (what, self.user, self.repo)

    def list(self, open=False, closed=False):
        issues = {'open':[], 'closed':[]}
        if open:
            url = self.make_url('list') + '/open'
            issues['open'].extend(json_loads(urlopen(url).read())['issues'])
        if closed:
            url = self.make_url('list') + '/closed'
            issues['closed'].extend(json_loads(urlopen(url).read())['issues'])
        return issues

    def add(self, title, body):
        params = {'title':title, 'body':body, 'token':self.token, 'login':self.user}
        return urlopen(self.make_url('open'), urlencode(params))

    def comments(self, number):
        url = self.make_url('comments') + '/%s' % (number, )
        return json_loads(urlopen(url).read())



class GitHubBlob(GitHubApi):
    feature_url = 'blob/%s/%s/%s/%s/%s'

    def __init__(self, branch=None, tag=None):
        repo = GitHubRepo()
        if tag:
            sha = repo.tags()['tags'][tag]
        elif branch:
            sha = repo.branches()['branches'][branch]
        else:
            raise TypeError('must supply branch or tag')
        self.sha = sha

    def make_url(self, what, sha, path):
        return self.base_url + self.feature_url % (what, self.user, self.repo, sha, path)

    def show(self, sha, path):
        url = self.make_url('show', sha, path)
        return json_loads(urlopen(url).read())


class GitHubMarkdownBlob(GitHubBlob):
    def encoded(self, sha, path):
        data = self.show(sha, path)['blob']['data']
        return markdown(data)

    def read(self):
        return self.encoded(self.sha, self.filename)


##
# client classes that make up the support center model


class Issues(GitHubIssues):
    pass


class Contact(object):
    pass



class ToDoFile(GitHubMarkdownBlob):
    filename = 'TODO.md'


class ChangeLogFile(GitHubMarkdownBlob):
    filename = 'CHANGES.md'
