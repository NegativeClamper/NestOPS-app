from django.db import migrations


RENAMES = [
    # (current_name, new_name)
    ("Arjuna",       "Hostel Arjuna"),
    ("Bhima",        "Hostel Bhima"),
    ("Nakula",       "Hostel Karna"),   # full character swap — same DB row, new name
    ("Yudhishthira", "Hostel Yudhishthira"),
    ("Draupadi",     "Hostel Draupadi"),
    ("Sita",         "Hostel Sita"),
]


def rename_hostels(apps, schema_editor):
    Hostel = apps.get_model("hostels", "Hostel")
    for old_name, new_name in RENAMES:
        updated = Hostel.objects.filter(name=old_name).update(name=new_name)
        if updated == 0:
            # Already renamed (idempotent re-run) — check by new name
            if not Hostel.objects.filter(name=new_name).exists():
                raise ValueError(
                    f"Hostel rename failed: '{old_name}' not found and '{new_name}' doesn't exist either."
                )


def unrename_hostels(apps, schema_editor):
    """Reverse: restore original names."""
    Hostel = apps.get_model("hostels", "Hostel")
    for old_name, new_name in RENAMES:
        Hostel.objects.filter(name=new_name).update(name=old_name)


class Migration(migrations.Migration):

    dependencies = [
        ("hostels", "0002_seed_hostels"),
    ]

    operations = [
        migrations.RunPython(rename_hostels, unrename_hostels),
    ]
