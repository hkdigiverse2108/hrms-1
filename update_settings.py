import re

filepath = "frontend/app/settings/page.tsx"
with open(filepath, "r") as f:
    content = f.read()

# Add our custom permissions booleans
content = content.replace(
    "const { checkPermission, isAdmin } = usePermissions();",
    "const { checkPermission, isAdmin } = usePermissions();\n  const canViewSettings = isAdmin || checkPermission('settings', 'canView');\n  const canEditSettings = isAdmin || checkPermission('settings', 'canEdit');"
)

# Change the Save button condition
content = content.replace(
    "{isAdmin && (\n          <Button \n            onClick={handleSaveAllSettings}",
    "{canEditSettings && (\n          <Button \n            onClick={handleSaveAllSettings}"
)

# Change card view conditions
content = re.sub(r"\{isAdmin && \(\n\s*<Card", r"{canViewSettings && (\n            <Card", content)

# Change disabled state
content = content.replace("disabled={isUpdating || !isAdmin}", "disabled={isUpdating || !canEditSettings}")
content = content.replace("disabled={isUpdating || user?.role !== 'Admin'}", "disabled={isUpdating || !canEditSettings}")

with open(filepath, "w") as f:
    f.write(content)
