import urllib.request
import re

url = "https://calendar.google.com/calendar/ical/en.indian%23holiday%40group.v.calendar.google.com/public/basic.ics"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req) as response:
        content = response.read().decode('utf-8')
except Exception as e:
    print(e)
    exit(1)

events = []
current_event = {}
for line in content.splitlines():
    if line.startswith('BEGIN:VEVENT'):
        current_event = {}
    elif line.startswith('DTSTART;VALUE=DATE:'):
        date_str = line.split(':')[1]
        if date_str.startswith('2026'):
            current_event['date'] = f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:]}"
    elif line.startswith('SUMMARY:'):
        current_event['name'] = line.split(':', 1)[1]
    elif line.startswith('END:VEVENT'):
        if 'date' in current_event and 'name' in current_event:
            events.append(current_event)

print(len(events))
for e in sorted(events, key=lambda x: x['date'])[:10]:
    print(e)
