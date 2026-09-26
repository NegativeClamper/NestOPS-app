import os
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

class Command(BaseCommand):
    help = "Creates a superuser (owner) non-interactively if it doesn't exist"

    def handle(self, *args, **options):
        User = get_user_model()

        username = os.environ.get('DJANGO_SUPERUSER_USERNAME')
        password = os.environ.get('DJANGO_SUPERUSER_PASSWORD')
        email = os.environ.get('DJANGO_SUPERUSER_EMAIL', '')

        if not username or not password:
            self.stdout.write(self.style.WARNING(
                "DJANGO_SUPERUSER_USERNAME or DJANGO_SUPERUSER_PASSWORD not set. Skipping superuser creation."
            ))
            return

        if User.objects.filter(username=username).exists():
            self.stdout.write(self.style.SUCCESS(
                f"Superuser '{username}' already exists. Skipping."
            ))
            return

        self.stdout.write(f"Creating superuser '{username}'...")
        user = User.objects.create_superuser(
            username=username,
            email=email,
            password=password
        )
        
        # Set the custom role to owner for multi-tenancy
        # owner_account is intentionally left None for the owner.
        user.role = "owner"
        user.save()

        self.stdout.write(self.style.SUCCESS(
            f"Successfully created superuser (owner) '{username}'."
        ))
