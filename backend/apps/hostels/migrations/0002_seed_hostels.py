"""
Seed migration: inserts the 6 hostel records.
"""
from django.db import migrations

HOSTELS = [
    {"name": "Yudhishthira", "gender": "boys",  "monthly_rate": "5000.00"},
    {"name": "Bhima",        "gender": "boys",  "monthly_rate": "5000.00"},
    {"name": "Arjuna",       "gender": "boys",  "monthly_rate": "5000.00"},
    {"name": "Nakula",       "gender": "boys",  "monthly_rate": "4500.00"},
    {"name": "Draupadi",     "gender": "girls", "monthly_rate": "4500.00"},
    {"name": "Sita",         "gender": "girls", "monthly_rate": "4500.00"},
]


def seed_hostels(apps, schema_editor):
    Hostel = apps.get_model("hostels", "Hostel")
    for data in HOSTELS:
        Hostel.objects.get_or_create(name=data["name"], defaults=data)


def unseed_hostels(apps, schema_editor):
    Hostel = apps.get_model("hostels", "Hostel")
    Hostel.objects.filter(name__in=[h["name"] for h in HOSTELS]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("hostels", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed_hostels, reverse_code=unseed_hostels),
    ]
