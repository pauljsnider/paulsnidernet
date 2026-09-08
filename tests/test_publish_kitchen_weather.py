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
