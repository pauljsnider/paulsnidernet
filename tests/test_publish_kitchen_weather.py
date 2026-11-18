import importlib.util
import unittest
from datetime import datetime
from pathlib import Path


MODULE_PATH = Path(__file__).resolve().parents[1] / 'scripts' / 'publish-kitchen-weather.py'
SPEC = importlib.util.spec_from_file_location('publish_kitchen_weather', MODULE_PATH)
WEATHER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(WEATHER)


class KitchenWeatherPublisherTests(unittest.TestCase):
    def test_build_weather_feed_uses_fahrenheit_and_short_conditions(self):
        feed = WEATHER.build_weather_feed(
            {
                'current': {'temperature_2m': 82.4, 'apparent_temperature': 86.1, 'weather_code': 2},
                'daily': {
                    'time': ['2026-09-07', '2026-09-08', '2026-09-09', '2026-09-10'],
                    'temperature_2m_max': [92.2, 100.0, 91.6, 87.1],
                    'temperature_2m_min': [74.6, 78.8, 68.7, 65.3],
                    'weather_code': [0, 1, 95, 2],
                    'precipitation_probability_max': [10, 4, 35, 15],
                },
            },
            now=datetime(2026, 9, 7, 21, 0, tzinfo=WEATHER.KITCHEN_TIMEZONE),
        )
        self.assertEqual(feed['location'], 'Leawood, KS')
        self.assertEqual(feed['current'], {'temperature_f': 82, 'feels_like_f': 86, 'condition': 'Partly cloudy'})
        self.assertEqual(feed['today']['high_f'], 92)
        self.assertEqual(feed['today']['low_f'], 75)
        self.assertEqual(feed['today']['condition'], 'Clear')
        self.assertEqual(
            feed['forecast'],
            [
                {'date': '2026-09-08', 'high_f': 100, 'low_f': 79, 'condition': 'Mostly clear', 'precipitation_chance': 4},
                {'date': '2026-09-09', 'high_f': 92, 'low_f': 69, 'condition': 'Thunderstorms', 'precipitation_chance': 35},
                {'date': '2026-09-10', 'high_f': 87, 'low_f': 65, 'condition': 'Partly cloudy', 'precipitation_chance': 15},
            ],
        )


class KitchenWeatherFetchTests(unittest.TestCase):
    def setUp(self):
        import tempfile
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.output = Path(self.temp.name) / 'weather.json'
        self.output.write_text('last-good-feed\n')

    def response(self, status=200, payload=None):
        import json
        response = WEATHER.requests.Response()
        response.status_code = status
        response.url = 'https://example.invalid/not-for-logs'
        response._content = json.dumps(payload if payload is not None else {
            'current': {'temperature_2m': 65, 'weather_code': 0}
        }).encode()
        return response

    def test_timeout_then_success_retries_and_updates(self):
        from unittest.mock import patch
        with patch.object(WEATHER.requests, 'get', side_effect=[WEATHER.requests.ReadTimeout('private text'), self.response()]) as get, patch.object(WEATHER.time, 'sleep') as sleep:
            feed = WEATHER.publish_weather(self.output)
        self.assertEqual(65, feed['current']['temperature_f'])
        self.assertEqual(2, get.call_count)
        sleep.assert_called_once_with(2)
        self.assertTrue(all(call.kwargs['timeout'] == (10, 60) for call in get.call_args_list))

    def test_transient_http_errors_retry(self):
        from unittest.mock import patch
        for status in [429, 503]:
            with self.subTest(status=status), patch.object(WEATHER.requests, 'get', side_effect=[self.response(status), self.response()]) as get, patch.object(WEATHER.time, 'sleep'):
                WEATHER.publish_weather(self.output)
                self.assertEqual(2, get.call_count)

    def test_exhausted_timeouts_retain_prior_bytes_and_report_class(self):
        from unittest.mock import patch
        with patch.object(WEATHER.requests, 'get', side_effect=WEATHER.requests.Timeout('private exception body')) as get, patch.object(WEATHER.time, 'sleep') as sleep:
            with self.assertRaisesRegex(RuntimeError, 'Timeout after 3 attempt') as error:
                WEATHER.publish_weather(self.output)
        self.assertEqual(3, get.call_count)
        self.assertEqual(2, sleep.call_count)
        self.assertNotIn('private exception body', str(error.exception))
        self.assertEqual('last-good-feed\n', self.output.read_text())

    def test_permanent_http_error_stops_and_preserves_feed(self):
        from unittest.mock import patch
        with patch.object(WEATHER.requests, 'get', return_value=self.response(404)) as get, patch.object(WEATHER.time, 'sleep') as sleep:
            with self.assertRaisesRegex(RuntimeError, 'HTTP 404 after 1 attempt') as error:
                WEATHER.publish_weather(self.output)
        get.assert_called_once()
        sleep.assert_not_called()
        self.assertNotIn('https://', str(error.exception))
        self.assertEqual('last-good-feed\n', self.output.read_text())

    def test_invalid_payload_does_not_replace_last_good_feed(self):
        from unittest.mock import patch
        for payload in [{}, {'current': {}}, []]:
            with self.subTest(payload=payload), patch.object(WEATHER.requests, 'get', return_value=self.response(payload=payload)), patch.object(WEATHER.time, 'sleep') as sleep:
                with self.assertRaises(RuntimeError):
                    WEATHER.publish_weather(self.output)
                sleep.assert_not_called()
                self.assertEqual('last-good-feed\n', self.output.read_text())


class KitchenWeatherWorkflowTests(unittest.TestCase):
    def test_refresh_triggers_keep_main_only_publication_and_brief_independent(self):
        workflow = (MODULE_PATH.parents[1] / '.github/workflows/publish-kitchen-weather.yml').read_text()
        self.assertIn("cron: '17 * * * *'", workflow)
        self.assertIn('workflows: [Combine Family Calendars, Publish Kitchen Photos, Kitchen validation]', workflow)
        self.assertIn("github.ref == 'refs/heads/main'", workflow)
        self.assertIn("github.event.workflow_run.conclusion == 'success'", workflow)
        self.assertIn("github.event.workflow_run.head_branch == 'main'", workflow)
        self.assertIn('github.event.workflow_run.head_repository.full_name == github.repository', workflow)
        self.assertIn("github.event.workflow_run.event != 'pull_request'", workflow)
        self.assertIn('ref: main', workflow)
        self.assertIn('cancel-in-progress: false', workflow)
        weather_step = workflow.split('- name: Build the local weather feed')[1].split('- name: Build the Daily Brief feed')[0]
        brief_step = workflow.split('- name: Build the Daily Brief feed')[1].split('- name: Commit and push')[0]
        self.assertIn('continue-on-error: true', weather_step)
        self.assertNotIn('if:', brief_step)
        self.assertLess(workflow.index('bash scripts/push-kitchen-weather.sh'), workflow.index('- name: Report weather refresh failure'))


class RetryAfterTests(unittest.TestCase):
    setUp = KitchenWeatherFetchTests.setUp
    response = KitchenWeatherFetchTests.response

    def test_retry_after_numeric_and_http_date(self):
        from datetime import timezone
        fixed = datetime(2026, 11, 18, 0, 0, tzinfo=timezone.utc)
        response = self.response(429)
        for value, expected in [('25', 25), ('Wed, 18 Nov 2026 00:00:40 GMT', 40),
                                ('Tue, 17 Nov 2026 23:59:59 GMT', 0), ('0', 0),
                                ('-5', None), ('1.5', None), ('bad header', None), ('', None)]:
            with self.subTest(value=value):
                response.headers['Retry-After'] = value
                self.assertEqual(WEATHER.retry_after_seconds(response, fixed), expected)

    def test_server_delay_then_success(self):
        from unittest.mock import patch
        for status in [429, 503]:
            response = self.response(status)
            response.headers['Retry-After'] = '60'
            with self.subTest(status=status), patch.object(WEATHER.requests, 'get', side_effect=[response, self.response()]), patch.object(WEATHER.time, 'sleep') as sleep:
                WEATHER.publish_weather(self.output)
                sleep.assert_called_once_with(60)

    def test_long_wait_defers_without_early_retry_or_overwrite(self):
        from unittest.mock import patch
        for value in ['61', '99999999999999999999', 'Wed, 18 Nov 2099 00:00:00 GMT']:
            response = self.response(429)
            response.headers['Retry-After'] = value
            with self.subTest(value=value), patch.object(WEATHER.requests, 'get', return_value=response) as get, patch.object(WEATHER.time, 'sleep') as sleep:
                with self.assertRaisesRegex(RuntimeError, 'deferring to a later run'):
                    WEATHER.publish_weather(self.output)
                get.assert_called_once()
                sleep.assert_not_called()
                self.assertEqual('last-good-feed\n', self.output.read_text())

    def test_malformed_header_uses_backoff_without_logging_value(self):
        import contextlib
        import io
        from unittest.mock import patch
        response = self.response(429)
        response.headers['Retry-After'] = 'https://example.invalid/private-marker'
        log = io.StringIO()
        with patch.object(WEATHER.requests, 'get', side_effect=[response, self.response()]), patch.object(WEATHER.time, 'sleep') as sleep, contextlib.redirect_stderr(log):
            WEATHER.publish_weather(self.output)
        sleep.assert_called_once_with(2)
        self.assertNotIn('private-marker', log.getvalue())
        self.assertNotIn('https://', log.getvalue())

    def test_elapsed_diagnostic_is_sanitized_and_bounded(self):
        import contextlib
        import io
        from unittest.mock import patch
        log = io.StringIO()
        with patch.object(WEATHER.requests, 'get', side_effect=WEATHER.requests.ReadTimeout('private-message')), patch.object(WEATHER.time, 'sleep') as sleep, patch.object(WEATHER.time, 'monotonic', side_effect=[0,10,12,22,26,36]), contextlib.redirect_stderr(log):
            with self.assertRaises(RuntimeError) as caught:
                WEATHER.publish_weather(self.output)
        diagnostic = log.getvalue() + str(caught.exception)
        self.assertIn('phase=request, elapsed=10.00s', diagnostic)
        self.assertNotIn('private-message', diagnostic)
        self.assertEqual([c.args[0] for c in sleep.call_args_list], [2,4])
        self.assertEqual('last-good-feed\n', self.output.read_text())
