from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("expenses", "0002_seed_default_categories"),
        ("hostels", "0002_seed_hostels"),
    ]

    operations = [
        migrations.AddField(
            model_name="expense",
            name="hostel",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="expenses",
                to="hostels.hostel",
            ),
        ),
    ]
