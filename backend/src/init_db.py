#!/usr/bin/env python
"""Initialize the database with tables."""

from src.database.database import Base, engine


def init_db():
    """Create all database tables."""
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created successfully!")

if __name__ == "__main__":
    init_db()
