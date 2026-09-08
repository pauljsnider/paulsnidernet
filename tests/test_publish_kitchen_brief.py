import importlib.util
import unittest
from datetime import datetime
from pathlib import Path


MODULE_PATH = Path(__file__).resolve().parents[1] / 'scripts' / 'publish-kitchen-brief.py'
SPEC = importlib.util.spec_from_file_location('publish_kitchen_brief', MODULE_PATH)
BRIEF = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(BRIEF)


class KitchenBriefPublisherTests(unittest.TestCase):
    def test_kc_library_parser_selects_a_safe_upcoming_family_event(self):
        html = '''
        <a class="calendar-link" href="/calendar/family-storytime">
          <div class="calendar-link__title">Family Storytime</div>
          <div class="calendar-link__details"><time datetime="2026-09-08T09:30:00-05:00">9:30 am</time> | Central Library</div>
        </a>
        <a class="calendar-link" href="/calendar/beer-night">
          <div class="calendar-link__title">Family Beer Night</div>
          <div class="calendar-link__details"><time datetime="2026-09-08T19:30:00-05:00">7:30 pm</time> | Central Library</div>
        </a>
        '''
        events = BRIEF.parse_kc_library_events(
            html,
            datetime(2026, 9, 7, 8, 0, tzinfo=BRIEF.KITCHEN_TIMEZONE),
        )

        self.assertEqual(1, len(events))
        self.assertEqual('Family Storytime', events[0]['title'])
        self.assertEqual('Tue, Sep 8 at 9:30 AM • Central Library', events[0]['detail'])
        self.assertEqual('https://kclibrary.org/calendar/family-storytime', events[0]['url'])

    def test_mit_feed_parser_keeps_the_source_headline_without_a_summary(self):
        item = BRIEF.parse_mit_ai_feed('''
        <rss><channel><item>
          <title>System helps humans predict when self-driving cars will make mistakes</title>
          <link>https://news.mit.edu/example</link>
          <pubDate>Wed, 02 Sep 2026 11:00:00 -0400</pubDate>
        </item></channel></rss>
        ''')

        self.assertEqual('MIT News', item['source'])
        self.assertEqual('MIT News • AI & science', item['detail'])
        self.assertNotIn('summary', item)

    def test_market_parser_returns_the_latest_close_and_daily_change(self):
        market = BRIEF.parse_market_close(
            'observation_date,SP500\n2026-09-03,7747.71\n2026-09-04,7718.60\n',
            'S&P 500',
        )

        self.assertEqual(
            {'name': 'S&P 500', 'value': 7718.6, 'change_pct': -0.38, 'as_of': '2026-09-04'},
            market,
        )
