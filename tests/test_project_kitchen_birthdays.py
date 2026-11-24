import importlib.util
import json
from pathlib import Path
from datetime import date
import tempfile
import unittest
from unittest.mock import patch
from icalendar import Calendar, Event
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('projection',ROOT/'scripts/project-kitchen-birthdays.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)

def source(first=date(2027,2,9), uid='synthetic-one', label='Example birthday'):
 c=Calendar();c.add('version','2.0');e=Event();e.add('uid',uid);e.add('summary',label);e.add('dtstart',first)
 from datetime import timedelta
 e.add('dtend',first+timedelta(days=1));e.add('rrule',{'freq':'yearly'});c.add_component(e);return c

class Projection(unittest.TestCase):
 def setUp(self):
  p=patch.object(m,'COUNTDOWN_UIDS',frozenset({'synthetic-one'}));p.start();self.addCleanup(p.stop)
 def test_beyond_six_weeks_and_year_rollover(self):
  self.assertEqual([{'label':'Example birthday','date':'2027-02-09'}],m.project(source().to_ical(),date(2026,11,24)))
  self.assertEqual('2028-02-09',m.project(source().to_ical(),date(2027,2,10))[0]['date'])
 def test_today_and_dst_calendar_days(self):
  self.assertEqual('2027-02-09',m.project(source().to_ical(),date(2027,2,9))[0]['date'])
  for first in [date(2027,3,14),date(2027,11,7)]:
   self.assertEqual(first.isoformat(),m.project(source(first).to_ical(),first)[0]['date'])
 def test_other_birthdays_and_parties_excluded(self):
  self.assertEqual([],m.project(source(uid='calendar-only').to_ical(),date(2026,11,24)))
 def test_never_invents_nonleap_birthday(self):
  rows=m.project(source(date(2028,2,29)).to_ical(),date(2028,3,1));self.assertEqual([],rows)
 def test_missing_record_stays_empty_and_future_start_respected(self):
  self.assertEqual([],m.project(source(date(2030,2,9)).to_ical(),date(2026,11,24)))
 def test_duplicate_private_or_cancelled_source(self):
  c=source();c.add_component(c.walk('VEVENT')[0]);
  with self.assertRaises(ValueError):m.project(c.to_ical(),date(2026,11,24))
  c=source();c.walk('VEVENT')[0].add('description','Synthetic forbidden detail')
  with self.assertRaises(ValueError):m.project(c.to_ical(),date(2026,11,24))
  c=source();c.walk('VEVENT')[0].add('status','CANCELLED');self.assertEqual([],m.project(c.to_ical(),date(2026,11,24)))
 def test_entry_point_preserves_feed_and_fails_without_partial_write(self):
  with tempfile.TemporaryDirectory() as d:
   s=Path(d)/'birthdays.ics';f=Path(d)/'events.json';s.write_bytes(source().to_ical())
   original={'timezone':'America/Chicago','generated_at':'2026-11-24T01:00:00+00:00','events':[{'summary':'Synthetic schedule'}],'complete':False,'source_health':[{'name':'Example','status':'cached'}]};f.write_text(json.dumps(original));m.update(s,f)
   result=json.loads(f.read_text());self.assertEqual([{'label':'Example birthday','date':'2027-02-09'}],result.pop('birthdays'));self.assertEqual(original,result)
   prior=f.read_bytes();s.write_bytes(b'bad source')
   with self.assertRaises(ValueError):m.update(s,f)
   self.assertEqual(prior,f.read_bytes())
if __name__=='__main__':unittest.main()
