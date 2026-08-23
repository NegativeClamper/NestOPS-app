from django.apps import AppConfig


class ExpensesConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.expenses"
    verbose_name = "Expenses"

    def ready(self):
        """Seed default expense categories on first run."""
        pass  # Handled by a data migration instead
