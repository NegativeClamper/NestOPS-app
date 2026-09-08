from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("fees", "0002_payment_hostel"),
    ]

    operations = [
        migrations.AddField(
            model_name="payment",
            name="transaction_id",
            field=models.CharField(blank=True, default="", max_length=100),
        ),
        migrations.AddField(
            model_name="payment",
            name="transaction_screenshot",
            field=models.ImageField(blank=True, null=True, upload_to="transaction_screenshots/"),
        ),
        migrations.AddField(
            model_name="payment",
            name="verified",
            field=models.BooleanField(
                default=True,
                help_text="False = submitted via intake form, awaiting owner review.",
            ),
        ),
    ]
