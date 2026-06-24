import sys
import asyncio
sys.path.append('d:/hrms-1/backend')
from database import get_db

async def main():
    db_gen = get_db()
    db = await anext(db_gen)
    inv = await db.invoices.find_one()
    print(inv)

asyncio.run(main())
