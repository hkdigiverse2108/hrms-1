from motor.motor_asyncio import AsyncIOMotorClient
import asyncio
import os
import re
from datetime import datetime
from dotenv import load_dotenv

load_dotenv('.env')

async def fix_already_approved():
    client = AsyncIOMotorClient(os.getenv('MONGO_URL'), tls=True, tlsAllowInvalidCertificates=True)
    db = client.hrms_db
    
    today = datetime.now().strftime("%Y-%m-%d")
    requests = await db.time_recovery.find({'status': 'approved', 'date': today}).to_list(length=100)
    
    for doc in requests:
        print(f"Processing request: {doc['_id']} for {doc.get('employee_name')}")
        reason = doc.get('reason', '')
        
        search_query = {
            '$or': [
                {'employeeId': {'$regex': f'^{re.escape(str(doc["employee_id"]))}$', '$options': 'i'}},
                {'employee_id': {'$regex': f'^{re.escape(str(doc["employee_id"]))}$', '$options': 'i'}},
                {'employeeName': {'$regex': f'^{re.escape(str(doc.get("employee_name", "")))}', '$options': 'i'}},
                {'employee_name': {'$regex': f'^{re.escape(str(doc.get("employee_name", "")))}', '$options': 'i'}}
            ],
            'date': doc['date']
        }
        attn_list = await db.attendance.find(search_query).to_list(length=100)
        
        if not attn_list:
            print(f"  No attendance records found.")
            continue

        async def apply_updates(attn_record, updated_breaks):
            if attn_record.get('checkIn') and attn_record.get('checkOut'):
                try:
                    ci = datetime.strptime(attn_record['checkIn'], "%H:%M:%S" if ":" in attn_record['checkIn'] else "%H:%M")
                    co = datetime.strptime(attn_record['checkOut'], "%H:%M:%S" if ":" in attn_record['checkOut'] else "%H:%M")
                    diff = co - ci
                    h, r = divmod(diff.total_seconds(), 3600)
                    m, _ = divmod(r, 60)
                    attn_record['workHours'] = f"{int(h)}h {int(m)}m"
                except: pass
            
            await db.attendance.update_one(
                {'_id': attn_record['_id']},
                {'$set': {
                    'breaks': updated_breaks,
                    'checkIn': attn_record.get('checkIn'),
                    'workHours': attn_record.get('workHours'),
                    'status': 'Logged'
                }}
            )

        break_match = re.search(r'Break-In:\s*(\d{1,2}:\d{2}),\s*Actual Break-Out:\s*(\d{1,2}:\d{2})', reason)
        if break_match:
            break_in, break_out = break_match.group(1), break_match.group(2)
            if len(break_in.split(':')[0]) == 1: break_in = '0' + break_in
            if len(break_out.split(':')[0]) == 1: break_out = '0' + break_out

            for attn in attn_list:
                updated = False
                breaks = attn.get('breaks', [])
                
                best_break = None
                min_diff = 16
                for b in breaks:
                    try:
                        db_h, db_m = map(int, b.get('startTime', '00:00').split(':')[:2])
                        req_h, req_m = map(int, break_in.split(':')[:2])
                        diff = abs((db_h * 60 + db_m) - (req_h * 60 + req_m))
                        if diff < min_diff:
                            min_diff = diff
                            best_break = b
                    except: continue
                
                if best_break:
                    print(f"  Best match found in record {attn['_id']} ({attn['checkIn']}) with {min_diff}m diff")
                    best_break['endTime'] = break_out
                    t1, t2 = datetime.strptime(break_in, '%H:%M'), datetime.strptime(break_out, '%H:%M')
                    best_break['duration'] = str(int((t2 - t1).total_seconds() / 60))
                    updated = True
                else:
                    try:
                        cin_h, cin_m = map(int, attn['checkIn'].split(':')[:2])
                        cout_h, cout_m = map(int, attn.get('checkOut', '23:59:59').split(':')[:2])
                        req_h, req_m = map(int, break_in.split(':')[:2])
                        if (cin_h * 60 + cin_m) <= (req_h * 60 + req_m) <= (cout_h * 60 + cout_m):
                            print(f"  Adding NEW break to record {attn['_id']} ({attn['checkIn']})")
                            t1, t2 = datetime.strptime(break_in, '%H:%M'), datetime.strptime(break_out, '%H:%M')
                            breaks.append({
                                "startTime": f"{break_in}:00",
                                "endTime": f"{break_out}:00",
                                "duration": str(int((t2 - t1).total_seconds() / 60))
                            })
                            updated = True
                    except: pass

                if updated:
                    await apply_updates(attn, breaks)
                    print(f"  Successfully updated record {attn['_id']}")

if __name__ == "__main__":
    asyncio.run(fix_already_approved())
