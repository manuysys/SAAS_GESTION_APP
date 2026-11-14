from __future__ import annotations

from decimal import Decimal
from zoneinfo import ZoneInfo

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

_ALLOWED_CURRENCIES = frozenset({"ARS"})
_MAX_SERVICES = 20
_MAX_SERIALIZED_BYTES = 16 * 1024
_MAX_PRICE = Decimal("999999999999.99")
_ALLOWED_DAYS = frozenset(
    {
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
    }
)
_HHMM_RE = r"^([01]\d|2[0-3]):([0-5]\d)$"


def _check_serialized_size[T: BaseModel](model: T) -> T:
    size = len(model.model_dump_json().encode("utf-8"))
    if size > _MAX_SERIALIZED_BYTES:
        raise ValueError("El estado de onboarding supera el tamaño máximo permitido")
    return model


class OnboardingCompany(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: str = Field(default="Mi Empresa", max_length=160)
    timezone: str = Field(default="America/Argentina/Buenos_Aires", max_length=64)
    currency: str = Field(default="ARS", max_length=3)

    @field_validator("timezone")
    @classmethod
    def _timezone_allowed(cls, v: str) -> str:
        try:
            ZoneInfo(v)
        except Exception as exc:
            raise ValueError("Zona horaria inválida") from exc
        return v

    @field_validator("currency")
    @classmethod
    def _currency_allowed(cls, v: str) -> str:
        if v not in _ALLOWED_CURRENCIES:
            raise ValueError("Moneda no permitida")
        return v


class OnboardingService(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: str = Field(max_length=120)
    duration_minutes: int = Field(default=60, ge=1, le=1440)
    price: Decimal = Field(
        default=Decimal("0.00"),
        decimal_places=2,
        ge=Decimal("0"),
        le=_MAX_PRICE,
    )


class OnboardingDaySchedule(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    start: str = Field(default="09:00", pattern=_HHMM_RE)
    end: str = Field(default="18:00", pattern=_HHMM_RE)

    @model_validator(mode="after")
    def _start_before_end(self) -> OnboardingDaySchedule:
        if self.start >= self.end:
            raise ValueError("La hora de inicio debe ser anterior a la de fin")
        return self


class OnboardingState(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    step: int = Field(default=1, ge=1, le=4)
    company: OnboardingCompany = Field(default_factory=OnboardingCompany)
    services: list[OnboardingService] = Field(
        default_factory=lambda: [
            OnboardingService(
                name="Instalación",
                duration_minutes=60,
                price=Decimal("15000.00"),
            )
        ],
        max_length=_MAX_SERVICES,
    )
    schedule: dict[str, OnboardingDaySchedule] = Field(
        default_factory=lambda: {
            "monday": OnboardingDaySchedule(),
            "tuesday": OnboardingDaySchedule(),
            "wednesday": OnboardingDaySchedule(),
            "thursday": OnboardingDaySchedule(),
            "friday": OnboardingDaySchedule(),
        }
    )
    team_invited: bool = False
    first_customer: bool = False

    @field_validator("schedule")
    @classmethod
    def _schedule_days_allowed(
        cls, v: dict[str, OnboardingDaySchedule]
    ) -> dict[str, OnboardingDaySchedule]:
        for day in v:
            if day not in _ALLOWED_DAYS:
                raise ValueError(f"Día de agenda no válido: {day}")
        return v

    @model_validator(mode="after")
    def _size_limit(self) -> OnboardingState:
        return _check_serialized_size(self)


class OnboardingResponse(BaseModel):
    completed: bool
    state: OnboardingState


class OnboardingUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    step: int | None = Field(default=None, ge=1, le=4)
    company: OnboardingCompany | None = None
    services: list[OnboardingService] | None = Field(default=None, max_length=_MAX_SERVICES)
    schedule: dict[str, OnboardingDaySchedule | None] | None = None
    team_invited: bool | None = None
    first_customer: bool | None = None

    @field_validator("schedule")
    @classmethod
    def _schedule_days_allowed(
        cls, v: dict[str, OnboardingDaySchedule | None] | None
    ) -> dict[str, OnboardingDaySchedule | None] | None:
        if v is None:
            return v
        for day in v:
            if day not in _ALLOWED_DAYS:
                raise ValueError(f"Día de agenda no válido: {day}")
        return v
