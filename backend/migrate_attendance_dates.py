import asyncio
import os
import sys
from pathlib import Path
from datetime import datetime, timedelta

# Add backend to path
sys.path.append(str(Path(__file__).resolve().parent))

from database import db

async def main():
    attendance = await db.attendance.find().to_list(length=1000)
    migrated_count = 0
    
    for att in attendance:
        date_val = att.get('date')
        if isinstance(date_val, datetime):
            # If the hour/minute is not zero, it's skewed (e.g. 18:07:00 UTC instead of 00:00:00 IST)
            # Add 6 hours to push it into the correct local day, then strip the time
            if date_val.hour != 0 or date_val.minute != 0:
                local_dt = date_val + timedelta(hours=6)
            else:
                local_dt = date_val
                
            corrected_date = datetime.combine(local_dt.date(), datetime.min.time())
            
            # If they don't match, update in the database
            if date_val != corrected_date:
                await db.attendance.update_one(
                    {"_id": att["_id"]},
                    {"$set": {"date": corrected_date}}
                )
                print(f"Migrated record {att['_id']}: {date_val} -> {corrected_date}")
                migrated_count += 1
                
    print(f"\nMigration complete. Total records migrated: {migrated_count}")

if __name__ == "__main__":
    os.environ["MONGO_URL"] = "mongodb+srv://HK_Digiverse:HK%40Digiverse%40123@cluster0.lcbyqbq.mongodb.net/hrms_db?retryWrites=true&w=majority&appName=Cluster0"
    asyncio.run(main())
