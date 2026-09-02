import pytest
from app.database import init_db

@pytest.fixture(autouse=True)
async def setup_test_db():
    await init_db()
    yield
