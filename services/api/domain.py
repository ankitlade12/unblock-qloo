from datetime import datetime, timedelta, timezone
from typing import Literal
from pydantic import BaseModel, Field, ConfigDict, model_validator


def now():
    return datetime.now(timezone.utc)


def stamp():
    return now().isoformat()


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Event(Strict):
    id: str = Field(pattern=r"^[a-zA-Z0-9_-]{1,64}$")
    title: str = Field(min_length=1, max_length=120)
    category: str = "Film"
    description: str = Field(max_length=2000)
    venue: str = Field(min_length=1, max_length=120)
    start: datetime
    end: datetime
    tickets: int = Field(ge=0, le=100)
    ticket_minor: int = Field(ge=0, le=100000)
    step_free: bool | None
    hearing_loop: bool | None
    source: str = Field(min_length=1, max_length=500)
    observed_at: datetime
    valid_until: datetime
    entity_id: str | None = None
    version: int = 1
    cancelled: bool = False
    mode: Literal["synthetic", "organizer-reported"] = "synthetic"

    @model_validator(mode="after")
    def dates(self):
        for name in ("start", "end", "observed_at", "valid_until"):
            if getattr(self, name).tzinfo is None:
                raise ValueError("Use timezone-aware dates")
        if self.end <= self.start:
            raise ValueError("Event end must follow start")
        return self


class Offer(Strict):
    id: str = Field(pattern=r"^[a-zA-Z0-9_-]{1,64}$")
    event_id: str
    provider: str = Field(min_length=1, max_length=120)
    vehicle: str = Field(min_length=1, max_length=80)
    departure: datetime
    returns: datetime
    seats: int = Field(ge=0, le=100)
    wheelchair: int = Field(ge=0, le=20)
    step_free: bool | None
    fixed_minor: int = Field(ge=0, le=1000000)
    contribution_minor: int = Field(ge=0, le=100000)
    minimum: int = Field(ge=1, le=100)
    expires_at: datetime
    source: str = Field(min_length=1, max_length=500)
    version: int = 1
    active: bool = True
    mode: Literal["synthetic", "organizer-reported"] = "synthetic"

    @model_validator(mode="after")
    def dates(self):
        for name in ("departure", "returns", "expires_at"):
            if getattr(self, name).tzinfo is None:
                raise ValueError("Use timezone-aware dates")
        if self.returns <= self.departure:
            raise ValueError("Return must follow departure")
        return self


class Requirements(Strict):
    available_from: datetime
    available_until: datetime
    contribution_minor: int = Field(ge=0, le=100000)
    wheelchair: bool = False
    step_free: bool = False
    hearing_loop: bool = False
    companion: bool = False
    mandatory: bool = False
    withdrawn: bool = False

    @model_validator(mode="after")
    def dates(self):
        if self.available_from.tzinfo is None or self.available_until.tzinfo is None:
            raise ValueError("Use timezone-aware dates")
        if self.available_until <= self.available_from:
            raise ValueError("Availability end must follow start")
        return self


def seed():
    day = (now() + timedelta(days=4)).replace(
        hour=19, minute=0, second=0, microsecond=0
    )
    observed = now()
    titles = [
        "Soul",
        "The Grand Budapest Hotel",
        "Spirited Away",
        "Hidden Figures",
        "Amélie",
        "The Secret Life of Walter Mitty",
        "Coco",
        "Fantastic Mr. Fox",
    ]
    descriptions = [
        "A jazz musician finds a new way to look at an ordinary day.",
        "An imaginative journey through a wonderfully eccentric hotel.",
        "A richly imagined adventure about courage and belonging.",
        "An inspiring story of three women who changed the space race.",
        "A little kindness can make a city feel like home.",
        "An invitation to step outside the everyday.",
        "Music, memory, and the people who bring us together.",
        "A charming stop-motion story about finding your people.",
    ]
    events = []
    for i, title in enumerate(titles):
        start = day + timedelta(hours=(i % 2) * 2)
        events.append(
            Event(
                id=f"e{i + 1}",
                title=title,
                description=descriptions[i],
                venue=["Oak Cliff Community Cinema", "Arts District Screening Room"][
                    i % 2
                ],
                start=start,
                end=start + timedelta(minutes=110),
                tickets=14 if i < 2 else 8,
                ticket_minor=[800, 1000, 600, 700, 800, 900, 600, 700][i],
                step_free=None if i == 4 else True,
                hearing_loop=i in [0, 2, 3, 6],
                source="Authored demonstration catalogue; not a real screening or venue claim.",
                observed_at=observed,
                valid_until=day + timedelta(days=1),
            ).model_dump(mode="json")
        )
    offers = []
    for i in range(len(events)):
        e = Event(**events[i])
        offers.append(
            Offer(
                id=f"o{i + 1}",
                event_id=e.id,
                provider=["Community Shuttle", "Neighbourhood Minibus"][i % 2],
                vehicle=f"vehicle-{i % 2}",
                departure=e.start - timedelta(minutes=45),
                returns=e.end + timedelta(minutes=45),
                seats=8,
                wheelchair=2 if i % 2 == 0 else 1,
                step_free=True,
                fixed_minor=[9000, 7000, 8000, 6000, 9000, 7000, 8000, 6000][i],
                contribution_minor=0,
                minimum=2,
                expires_at=day - timedelta(hours=1),
                source="Synthetic provider quote; seats include wheelchair occupants. Not bookable.",
            ).model_dump(mode="json")
        )
    people = []
    for i, name in enumerate(
        [
            "Alex",
            "Jordan",
            "Sam",
            "Riley",
            "Morgan",
            "Casey",
            "Taylor",
            "Jamie",
            "Avery",
            "Quinn",
            "Drew",
            "Parker",
        ]
    ):
        interests = {
            e["id"]: {"response": "unseen", "event_version": 1} for e in events
        }
        for eid in ["e1", "e3", "e4"] if i < 6 else ["e1", "e2", "e4"]:
            interests[eid] = {
                "response": "interested",
                "event_version": 1,
                "recorded_at": stamp(),
            }
        people.append(
            {
                "id": f"p{i + 1}",
                "name": name,
                "version": 1,
                "favorites": [],
                "consent": False,
                "requirements": Requirements(
                    available_from=day - timedelta(hours=2),
                    available_until=day + timedelta(hours=6),
                    contribution_minor=1500,
                    wheelchair=i in [1, 7],
                    step_free=i in [1, 7],
                    hearing_loop=i == 4,
                    companion=i == 1,
                ).model_dump(mode="json"),
                "interests": interests,
                "suggestions": [],
            }
        )
    return {
        "revision": 1,
        "name": "Oak Cliff Community",
        "window": {
            "name": "A little culture, together",
            "budget_minor": 30000,
            "currency": "USD",
            "timezone": "America/Chicago",
            "start": (day - timedelta(hours=2)).isoformat(),
            "end": (day + timedelta(hours=6)).isoformat(),
        },
        "participants": people,
        "events": events,
        "offers": offers,
        "proposals": [],
        "audit": [
            {
                "at": stamp(),
                "action": "Created isolated synthetic workspace",
                "detail": "12 fictional participants; no real event inventory.",
            }
        ],
        "evidence": [],
        "idempotency": {},
        "provider_calls": 0,
        "outcomes": [],
        "entity_candidates": [],
        "traces": [],
    }
