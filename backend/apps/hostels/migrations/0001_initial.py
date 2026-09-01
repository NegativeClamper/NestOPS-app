from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Hostel",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=100, unique=True)),
                ("gender", models.CharField(choices=[("boys", "Boys"), ("girls", "Girls")], max_length=5)),
                ("monthly_rate", models.DecimalField(
                    decimal_places=2,
                    help_text="Default monthly rent charged for a bed in this hostel.",
                    max_digits=10,
                )),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "verbose_name": "Hostel",
                "verbose_name_plural": "Hostels",
                "ordering": ["name"],
            },
        ),
    ]
