from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("residents", "0001_initial"),
        ("hostels", "0002_seed_hostels"),
    ]

    operations = [
        migrations.AddField(
            model_name="resident",
            name="hostel",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="residents",
                to="hostels.hostel",
            ),
        ),
    ]
