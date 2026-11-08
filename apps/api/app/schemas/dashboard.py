from decimal import Decimal

from pydantic import BaseModel


class DashboardSummaryResponse(BaseModel):
    customers_total: int
    service_requests_total: int
    service_requests_new: int
    work_orders_total: int
    work_orders_open: int
    quotes_total: int
    quotes_pending: int
    payments_total: Decimal
    pending_balance: Decimal
    appointments_today: int
