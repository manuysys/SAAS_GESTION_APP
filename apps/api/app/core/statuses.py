from typing import Final

PRIORITIES: Final = frozenset({"low", "normal", "high", "urgent"})
REQUEST_SOURCES: Final = frozenset({"whatsapp", "phone", "email", "web", "manual"})
REQUEST_STATUSES: Final = frozenset({"new", "triaged", "converted", "closed"})
OPERATIONAL_STATUSES: Final = frozenset(
    {"new", "scheduled", "in_progress", "waiting", "finished", "cancelled"}
)
COMMERCIAL_STATUSES: Final = frozenset({"draft", "sent", "approved", "rejected"})
PAYMENT_STATUSES: Final = frozenset({"pending", "partial", "paid", "not_applicable"})

OPERATIONAL_TRANSITIONS: Final[dict[str, frozenset[str]]] = {
    "new": frozenset({"scheduled", "cancelled"}),
    "scheduled": frozenset({"in_progress", "cancelled"}),
    "in_progress": frozenset({"waiting", "finished", "cancelled"}),
    "waiting": frozenset({"in_progress", "cancelled"}),
    "finished": frozenset(),
    "cancelled": frozenset(),
}

TECHNICIAN_TRANSITIONS: Final[dict[str, frozenset[str]]] = {
    "scheduled": frozenset({"in_progress"}),
    "in_progress": frozenset({"waiting", "finished"}),
    "waiting": frozenset({"in_progress"}),
}
