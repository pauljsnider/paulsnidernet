import unittest
from test_combine_calendars import COMBINE_CALENDARS, make_calendar, build_kitchen_feed
from datetime import datetime
import pytz

class KitchenChildTest(unittest.TestCase):
    def test_aggregate_source_does_not_assign_madison(self):
        event = make_calendar('test', 'Vipers FC Practice').walk('VEVENT')[0]
        self.assertEqual(['Will'], COMBINE_CALENDARS.kitchen_event_children(event, 'TeamSnap Events (Madison + Max + Will)'))
        event['SUMMARY'] = 'Unmapped practice'
        self.assertEqual([], COMBINE_CALENDARS.kitchen_event_children(event, 'TeamSnap Events (Madison + Max + Will)'))
        event['SUMMARY'] = 'Fall Book Fair Class Visit'
        self.assertEqual([], COMBINE_CALENDARS.kitchen_event_children(event, 'Overland Trail Elementary'))
        event['SUMMARY'] = 'School will open soon'
        self.assertEqual([], COMBINE_CALENDARS.kitchen_event_children(event, 'Overland Trail Elementary'))

    def test_explicit_multi_child_membership(self):
        event = make_calendar('test', 'Shared activity').walk('VEVENT')[0]
        event.add('X-FAMILY-CHILDREN', 'Will,Max')
        self.assertEqual(['Will','Max'], COMBINE_CALENDARS.kitchen_event_children(event, 'Overland Trail Elementary'))

    def test_recurring_occurrences_retain_membership(self):
        cal = make_calendar('test', 'Major Derek Practice')
        cal.walk('VEVENT')[0].add('rrule', {'freq':'weekly','count':3})
        feed = build_kitchen_feed(cal, now=pytz.timezone('America/Chicago').localize(datetime(2026,8,18)))
        self.assertEqual(3,len(feed['events']))
        self.assertTrue(all(e['children']==['Max'] for e in feed['events']))

    def test_single_source_and_schoolwide(self):
        event = make_calendar('test', 'No School').walk('VEVENT')[0]
        self.assertEqual(['Will'], COMBINE_CALENDARS.kitchen_event_children(event, 'Will Baseball'))
        self.assertEqual(['Madison','Will','Max'], COMBINE_CALENDARS.kitchen_event_children(event, 'Overland Trail Elementary'))
