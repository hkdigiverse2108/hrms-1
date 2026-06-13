from googleapiclient.discovery import build
import datetime
import pytz

def get_calendar_service(credentials):
    """Returns a Google Calendar API service instance."""
    if not credentials:
        return None
    return build('calendar', 'v3', credentials=credentials)

def create_event(credentials, schedule_data):
    """Creates a new event in the primary calendar."""
    service = get_calendar_service(credentials)
    if not service:
        return None
        
    # Convert dates to ISO format required by Google Calendar
    try:
        date_val = schedule_data.get('date', '')
        if isinstance(date_val, datetime.datetime) or isinstance(date_val, datetime.date):
            date_str = date_val.strftime('%Y-%m-%d')
        else:
            date_str = str(date_val)[:10]

        start_dt = datetime.datetime.strptime(f"{date_str} {schedule_data['startTime']}", "%Y-%m-%d %H:%M")
        end_dt = datetime.datetime.strptime(f"{date_str} {schedule_data['endTime']}", "%Y-%m-%d %H:%M")
        
        # Assuming local timezone is Asia/Kolkata since user is in India, but should ideally be configurable
        tz = pytz.timezone('Asia/Kolkata')
        start_dt = tz.localize(start_dt)
        end_dt = tz.localize(end_dt)
        
        event = {
          'summary': schedule_data.get('title', 'HRMS Schedule'),
          'description': schedule_data.get('description', ''),
          'start': {
            'dateTime': start_dt.isoformat(),
            'timeZone': 'Asia/Kolkata',
          },
          'end': {
            'dateTime': end_dt.isoformat(),
            'timeZone': 'Asia/Kolkata',
          },
        }
        
        created_event = service.events().insert(calendarId='primary', body=event).execute()
        return created_event.get('id')
    except Exception as e:
        print(f"Error creating Google Calendar event: {e}")
        return None

def update_event(credentials, google_event_id, schedule_data):
    """Updates an existing event."""
    service = get_calendar_service(credentials)
    if not service or not google_event_id:
        return False
        
    try:
        date_val = schedule_data.get('date', '')
        if isinstance(date_val, datetime.datetime) or isinstance(date_val, datetime.date):
            date_str = date_val.strftime('%Y-%m-%d')
        else:
            date_str = str(date_val)[:10]

        start_dt = datetime.datetime.strptime(f"{date_str} {schedule_data['startTime']}", "%Y-%m-%d %H:%M")
        end_dt = datetime.datetime.strptime(f"{date_str} {schedule_data['endTime']}", "%Y-%m-%d %H:%M")
        tz = pytz.timezone('Asia/Kolkata')
        start_dt = tz.localize(start_dt)
        end_dt = tz.localize(end_dt)
        
        event = {
          'summary': schedule_data.get('title', 'HRMS Schedule'),
          'description': schedule_data.get('description', ''),
          'start': {
            'dateTime': start_dt.isoformat(),
            'timeZone': 'Asia/Kolkata',
          },
          'end': {
            'dateTime': end_dt.isoformat(),
            'timeZone': 'Asia/Kolkata',
          },
        }
        
        service.events().update(calendarId='primary', eventId=google_event_id, body=event).execute()
        return True
    except Exception as e:
        print(f"Error updating Google Calendar event: {e}")
        return False

def delete_event(credentials, google_event_id):
    """Deletes an event."""
    service = get_calendar_service(credentials)
    if not service or not google_event_id:
        return False
        
    try:
        service.events().delete(calendarId='primary', eventId=google_event_id).execute()
        return True
    except Exception as e:
        print(f"Error deleting Google Calendar event: {e}")
        return False
