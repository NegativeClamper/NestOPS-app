from decimal import Decimal
from datetime import date

from django.db.models import Sum
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
import django_filters

from apps.accounts.permissions import IsOwner, IsOwnerOrStaff, IsOwnerOrReadOnly
from .models import ExpenseCategory, Expense
from .serializers import ExpenseCategorySerializer, ExpenseSerializer


class ExpenseCategoryViewSet(viewsets.ModelViewSet):
    """
    Expense category CRUD. Staff can read; Owner can create/edit.
    Cannot delete default categories.
    """
    queryset = ExpenseCategory.objects.all()
    serializer_class = ExpenseCategorySerializer
    permission_classes = [IsOwnerOrReadOnly]

    def destroy(self, request, *args, **kwargs):
        category = self.get_object()
        if category.is_default:
            return Response(
                {"detail": "Cannot delete a default expense category."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)


class ExpenseFilter(django_filters.FilterSet):
    category = django_filters.NumberFilter(field_name="category__id")
    date_from = django_filters.DateFilter(field_name="date", lookup_expr="gte")
    date_to = django_filters.DateFilter(field_name="date", lookup_expr="lte")
    month = django_filters.NumberFilter(field_name="date__month")
    year = django_filters.NumberFilter(field_name="date__year")

    class Meta:
        model = Expense
        fields = ["category", "date_from", "date_to", "month", "year"]


class ExpenseViewSet(viewsets.ModelViewSet):
    """
    Expense CRUD with category/date filtering and monthly summary.
    """
    queryset = (
        Expense.objects.select_related("category", "recorded_by").all()
    )
    serializer_class = ExpenseSerializer
    permission_classes = [IsOwnerOrStaff]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = ExpenseFilter
    search_fields = ["description", "category__name"]
    ordering_fields = ["date", "amount"]
    ordering = ["-date"]

    def get_permissions(self):
        if self.action == "destroy":
            return [IsOwner()]
        return [IsOwnerOrStaff()]

    @action(detail=False, methods=["get"], url_path="summary")
    def summary(self, request):
        """
        GET /api/expenses/summary/?year=2025&month=8 — monthly totals by category.
        If month/year not provided, defaults to current month.
        """
        today = date.today()
        year = int(request.query_params.get("year", today.year))
        month = int(request.query_params.get("month", today.month))

        expenses = Expense.objects.filter(date__year=year, date__month=month).select_related("category")
        total = expenses.aggregate(t=Sum("amount"))["t"] or Decimal("0")

        by_category = {}
        for exp in expenses:
            key = exp.category.name
            by_category[key] = by_category.get(key, Decimal("0")) + exp.amount

        return Response({
            "month": f"{year}-{month:02d}",
            "total": total,
            "by_category": {k: str(v) for k, v in by_category.items()},
        })
