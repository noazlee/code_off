import pytest
from db import Database

@pytest.fixture
def db():
    """Initialises a fresh database object for each test"""
    database = Database()
    yield database          # provides fixture instance
    database.data.clear()   # after yield cleanup step after every step - useful for real dbs

def test_add_user(db):
    db.add_user(1, "Alice")
    assert db.get_user(1) == "Alice"

def test_add_duplicate_user(db):
    db.add_user(1, "Alice")
    with pytest.raises(ValueError, match="User already exists"):
        db.add_user(1, "Bob")

def test_delete_user(db):
    db.add_user(2, "Bob")
    assert db.get_user(2) == "Bob"
    db.delete_user(2)
    assert db.get_user(2) is None
