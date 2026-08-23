from django.contrib import admin
from .models import ExpenseCategory, Expense


@admin.register(ExpenseCategory)
class ExpenseCategoryAdmin(admin.ModelAdmin):
    list_display = ["icon", "name", "is_default"]
    search_fields = ["name"]


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ["description", "category", "amount", "date", "recorded_by"]
    list_filter = ["category", "date"]
    search_fields = ["description", "category__name"]
    raw_id_fields = ["recorded_by"]
    readonly_fields = ["created_at", "updated_at"]
