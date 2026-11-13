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
        with patch.object(WEATHER.requests, 'get', side_effect=[WEATHER.requests.Timeout('private text'), self.response()]) as get, patch.object(WEATHER.time, 'sleep') as sleep:
            feed = WEATHER.publish_weather(self.output)
        self.assertEqual(65, feed['current']['temperature_f'])
        self.assertEqual(2, get.call_count)
        sleep.assert_called_once_with(2)

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
