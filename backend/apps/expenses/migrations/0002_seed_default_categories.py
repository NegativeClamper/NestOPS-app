from django.db import migrations


DEFAULT_CATEGORIES = [
    {"name": "Food & Groceries", "icon": "🍛"},
    {"name": "Maintenance", "icon": "🔧"},
    {"name": "Utilities", "icon": "💡"},
    {"name": "Staff Salaries", "icon": "👤"},
    {"name": "Other", "icon": "📦"},
]


def seed_categories(apps, schema_editor):
    ExpenseCategory = apps.get_model("expenses", "ExpenseCategory")
    for cat in DEFAULT_CATEGORIES:
        ExpenseCategory.objects.get_or_create(
            name=cat["name"],
            defaults={"icon": cat["icon"], "is_default": True},
        )


def reverse_seed(apps, schema_editor):
    ExpenseCategory = apps.get_model("expenses", "ExpenseCategory")
    ExpenseCategory.objects.filter(name__in=[c["name"] for c in DEFAULT_CATEGORIES]).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("expenses", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed_categories, reverse_seed),
    ]
