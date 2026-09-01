from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("fees", "0001_initial"),
        ("hostels", "0002_seed_hostels"),
        ("residents", "0002_resident_hostel"),
    ]

    operations = [
        migrations.AddField(
            model_name="payment",
            name="hostel",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="payments",
                to="hostels.hostel",
            ),
        ),
    ]
