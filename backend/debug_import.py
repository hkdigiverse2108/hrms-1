import sys
import os

print("CWD:", os.getcwd())
print("PYTHONPATH:", os.environ.get("PYTHONPATH"))
print("SYS.PATH:", sys.path)

try:
    import schemas
    print("schemas file:", schemas.__file__)
    print("UserPermissionUpdate fields:", schemas.UserPermissionUpdate.__fields__.keys())
except Exception as e:
    print("Error:", e)
