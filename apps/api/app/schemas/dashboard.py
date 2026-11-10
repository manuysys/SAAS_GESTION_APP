from datetime import datetime
from decimal import Decimal
from uuid import UUID

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


class DashboardAppointmentItem(BaseModel):
    id: UUID
    starts_at: datetime
    ends_at: datetime
    status: str
    order_code: str
    order_title: str
    customer_name: str
    technician_name: str | None


class DashboardOverdueOrderItem(BaseModel):
    id: UUID
    code: str
    title: str
    customer_name: str
    operational_status: str
    scheduled_at: datetime
    days_overdue: int


class DashboardUnassignedOrderItem(BaseModel):
    id: UUID
    code: str
    title: str
    customer_name: str
    priority: str
    created_at: datetime


class DashboardExpiringQuoteItem(BaseModel):
    id: UUID
    number: str
    customer_name: str
    total: Decimal
    valid_until: datetime
    days_left: int


class DashboardFinishedWithBalanceItem(BaseModel):
    id: UUID
    code: str
    title: str
    customer_name: str
    total: Decimal
    paid: Decimal
    balance: Decimal


class DashboardOperationCounts(BaseModel):
    today_appointments: int
    overdue_orders: int
    unassigned_orders: int
    expiring_quotes: int
    finished_with_balance: int


class DashboardOperationsResponse(BaseModel):
    today_appointments: list[DashboardAppointmentItem]
    overdue_orders: list[DashboardOverdueOrderItem]
    unassigned_orders: list[DashboardUnassignedOrderItem]
    expiring_quotes: list[DashboardExpiringQuoteItem]
    finished_with_balance: list[DashboardFinishedWithBalanceItem]
    counts: DashboardOperationCounts
