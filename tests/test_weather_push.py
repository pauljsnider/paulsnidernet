"""Exercise real Git races without network or production credentials."""
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / 'scripts/push-kitchen-weather.sh'


class WeatherPushTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.remote = self.root / 'remote.git'
        self.git(self.root, 'init', '--bare', str(self.remote))
        self.writer = self.root / 'writer'
        self.git(self.root, 'clone', str(self.remote), str(self.writer))
        self.git(self.writer, 'checkout', '-b', 'main')
        self.commit(self.writer, 'weather.json', 'old\n')
        self.git(self.writer, 'push', '-u', 'origin', 'main')
        self.other = self.root / 'other'
        self.git(self.root, 'clone', '--branch', 'main', str(self.remote), str(self.other))
        self.commit(self.writer, 'weather.json', 'fresh\n')

    def git(self, cwd, *args):
        return subprocess.check_output(['git', '-c', 'user.name=Test', '-c',
            'user.email=test@example.invalid', *args], cwd=cwd, stderr=subprocess.STDOUT, text=True)

    def commit(self, cwd, name, value):
        (cwd / name).write_text(value)
        self.git(cwd, 'add', name)
        self.git(cwd, 'commit', '-m', 'Update fixture')

    def publish(self, github_ref='refs/heads/main'):
        env = dict(os.environ, GIT_COMMITTER_NAME='Test', GIT_COMMITTER_EMAIL='test@example.invalid', GITHUB_REF=github_ref)
        return subprocess.run(['bash', str(SCRIPT)], cwd=self.writer, env=env,
                              text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)

    def test_preserves_concurrent_photo_commit(self):
        self.commit(self.other, 'photos.json', 'new photos\n')
        self.git(self.other, 'push')
        result = self.publish()
        self.assertEqual(0, result.returncode, result.stdout)
        self.assertEqual('fresh\n', self.git(self.remote, 'show', 'main:weather.json'))
        self.assertEqual('new photos\n', self.git(self.remote, 'show', 'main:photos.json'))

    def test_conflicting_weather_stops_without_overwrite(self):
        self.commit(self.other, 'weather.json', 'other fresh weather\n')
        self.git(self.other, 'push')
        before = self.git(self.remote, 'rev-parse', 'main')
        result = self.publish()
        self.assertNotEqual(0, result.returncode)
        self.assertIn('concurrent changes conflict', result.stdout)
        self.assertEqual(before, self.git(self.remote, 'rev-parse', 'main'))
        self.assertFalse((self.writer / '.git/rebase-merge').exists())

    def test_repeated_rejection_is_bounded(self):
        hook = self.remote / 'hooks/pre-receive'
        hook.write_text('#!/bin/sh\necho attempt >> "' + str(self.root / 'attempts') + '"\nexit 1\n')
        hook.chmod(0o755)
        result = self.publish()
        self.assertNotEqual(0, result.returncode)
        self.assertEqual(3, len((self.root / 'attempts').read_text().splitlines()))
        self.assertEqual('old\n', self.git(self.remote, 'show', 'main:weather.json'))

    def test_preview_branch_cannot_publish_unrelated_html(self):
        self.git(self.writer, 'checkout', '-b', 'preview')
        self.commit(self.writer, 'index.html', 'unfinished page\n')
        before = self.git(self.remote, 'rev-parse', 'main')
        result = self.publish('refs/heads/preview')
        self.assertNotEqual(0, result.returncode)
        self.assertIn('requires the main branch', result.stdout)
        self.assertEqual(before, self.git(self.remote, 'rev-parse', 'main'))
        self.assertNotIn('index.html', self.git(self.remote, 'ls-tree', '--name-only', 'main'))

    def test_preview_checkout_rejected_even_with_main_environment(self):
        self.git(self.writer, 'checkout', '-b', 'preview')
        before = self.git(self.remote, 'rev-parse', 'main')
        self.assertNotEqual(0, self.publish().returncode)
        self.assertEqual(before, self.git(self.remote, 'rev-parse', 'main'))

    def test_non_main_dispatch_rejected_even_with_main_checkout(self):
        before = self.git(self.remote, 'rev-parse', 'main')
        self.assertNotEqual(0, self.publish('refs/heads/preview').returncode)
        self.assertEqual(before, self.git(self.remote, 'rev-parse', 'main'))
