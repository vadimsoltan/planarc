from __future__ import annotations

from app.core.config import get_settings
from app.db.session import create_session_factory, create_sqlalchemy_engine
from app.services.seed_service import bootstrap_if_needed


def main() -> None:
    settings = get_settings()
    engine = create_sqlalchemy_engine(settings)
    session_factory = create_session_factory(engine)
    with session_factory() as session:
        bootstrap_if_needed(session, settings)
    engine.dispose()


if __name__ == "__main__":
    main()

