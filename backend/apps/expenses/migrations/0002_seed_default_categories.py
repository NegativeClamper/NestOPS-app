from django.db import migrations


DEFAULTS = [
    {"name": "Groceries", "icon": "🛒", "is_default": True},
    {"name": "Electricity", "icon": "⚡", "is_default": True},
    {"name": "Water", "icon": "💧", "is_default": True},
    {"name": "Internet", "icon": "📶", "is_default": True},
    {"name": "Maintenance", "icon": "🔧", "is_default": True},
    {"name": "Cleaning", "icon": "🧹", "is_default": True},
    {"name": "Gas", "icon": "🔥", "is_default": True},
    {"name": "Furniture", "icon": "🛋️", "is_default": True},
    {"name": "Security", "icon": "🔒", "is_default": True},
    {"name": "Miscellaneous", "icon": "📦", "is_default": True},
]


def seed_categories(apps, schema_editor):
    ExpenseCategory = apps.get_model("expenses", "ExpenseCategory")
    for cat in DEFAULTS:
        ExpenseCategory.objects.get_or_create(name=cat["name"], defaults=cat)


def unseed_categories(apps, schema_editor):
    ExpenseCategory = apps.get_model("expenses", "ExpenseCategory")
    ExpenseCategory.objects.filter(is_default=True).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("expenses", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed_categories, reverse_code=unseed_categories),
    ]
