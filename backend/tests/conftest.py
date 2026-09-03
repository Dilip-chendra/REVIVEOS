import pytest
from app.database import init_db
from app.state import set_active_environment

@pytest.fixture(autouse=True)
async def setup_test_db():
    await init_db()
    set_active_environment("default", "DEMO")
    yield
    set_active_environment("default", "DEMO")
