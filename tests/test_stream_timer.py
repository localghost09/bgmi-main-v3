"""Isolated producer timer API regression test (no changes to the live DB)."""
import json
import os
from pathlib import Path
import socket
import subprocess
import sys
import tempfile
import time
import unittest
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[1]


class StreamTimerTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        with socket.socket() as sock:
            sock.bind(('127.0.0.1', 0))
            port = sock.getsockname()[1]
        cls.base = f'http://127.0.0.1:{port}'
        cls.server = subprocess.Popen([sys.executable, 'server.py'], cwd=ROOT,
            env={**os.environ, 'HOST': '127.0.0.1', 'PORT': str(port),
                 'BGMI_DB': str(Path(cls.tmp.name) / 'test.db'),
                 'BGMI_UPLOADS': str(Path(cls.tmp.name) / 'uploads'),
                 'BGMI_ADMIN_LOGIN_BYPASS': '1'},
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        for _ in range(100):
            try:
                cls.call('/api/health')
                break
            except Exception:
                time.sleep(.05)
        else:
            cls.server.terminate()
            raise RuntimeError('Test server failed to start')
        cls.csrf = cls.call('/api/admin/me')[1]['csrf']

    @classmethod
    def tearDownClass(cls):
        cls.server.terminate()
        cls.server.wait(timeout=10)
        cls.tmp.cleanup()

    @classmethod
    def call(cls, path, data=None):
        req = urllib.request.Request(cls.base + path,
            data=json.dumps(data).encode() if data is not None else None,
            headers={'Content-Type': 'application/json',
                     'X-Admin-CSRF': getattr(cls, 'csrf', '')})
        try:
            with urllib.request.urlopen(req, timeout=5) as response:
                return response.status, json.load(response)
        except urllib.error.HTTPError as response:
            return response.code, json.load(response)

    def test_program_settings_validation_and_public_sync(self):
        path = '/api/admin/overlay-settings'
        patch = {'scene': 'casters', 'theme': 'bgis-2026',
                 'caster1': '<img src=x> HOST', 'caster2': 'COHOST',
                 'tagline1': 'Play by play', 'tagline2': 'Analysis',
                 'audio': False, 'map': 'rondo', 'sponsor': 'Partner'}
        self.assertEqual(self.call(path, {'pmgcProgram': patch})[0], 200)
        saved = self.call(path)[1]['pmgcProgram']
        public = self.call('/api/live/state')[1]['pmgcProgram']
        self.assertEqual(saved, public)
        for key, value in patch.items():
            self.assertEqual(saved[key], value)
        self.assertTrue(saved['revision'])
        self.call(path, {'pmgcProgram': {'caster1': 'UPDATED'}})
        current = self.call(path)[1]['pmgcProgram']
        self.assertEqual(current['revision'], saved['revision'])
        self.assertEqual(current['scene'], 'casters')
        for bad in [{'scene': 'bad'}, {'theme': 'bad'}, {'audio': 'yes'},
                    {'caster1': 'x' * 61}, {'tagline1': 'x' * 121},
                    {'revision': 'fake'}, {'map': 'localhost'}, [], None]:
            self.assertEqual(self.call(path, {'pmgcProgram': bad})[0], 400, bad)
            self.assertEqual(self.call(path)[1]['pmgcProgram'], current)
        self.call(path, {'pmgcProgram': {'scene': 'casters'}})
        self.assertNotEqual(self.call(path)[1]['pmgcProgram']['revision'], current['revision'])

    def test_timer_duration_persists_and_restarts_without_a_url_parameter(self):
        self.assertEqual(self.call('/api/admin/overlay-settings')[1]['streamStartSeconds'], 1200)
        self.assertEqual(self.call('/api/admin/overlay-settings', {'streamStartDuration': '5:30'})[0], 200)
        live = self.call('/api/live/state')[1]
        self.assertEqual(live['streamStartSeconds'], 330)
        self.assertTrue(live['streamStartRevision'])
        self.assertEqual(self.call('/api/admin/overlay-settings')[1]['streamStartSeconds'], 330)
        for value in ['5:60', '5.30', '', '0:00', '-1:30', '1000:00', '5:3']:
            code, body = self.call('/api/admin/overlay-settings', {'streamStartDuration': value})
            self.assertEqual(code, 400, value)
            self.assertIn('minutes:seconds', body['error'])
            self.assertEqual(self.call('/api/live/state')[1]['streamStartSeconds'], 330)
        # Reapplying the same duration explicitly restarts opening overlays.
        self.call('/api/admin/overlay-settings', {'streamStartDuration': '5:30'})
        self.assertNotEqual(live['streamStartRevision'], self.call('/api/live/state')[1]['streamStartRevision'])
        self.assertEqual(self.call('/api/admin/overlay-settings', {'streamStartDuration': '0:01'})[0], 200)
        self.assertEqual(self.call('/api/live/state')[1]['streamStartSeconds'], 1)


if __name__ == '__main__':
    unittest.main()
