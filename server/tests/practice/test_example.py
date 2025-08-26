from example import add, divide
import pytest

def test_add():
    assert add(2, 3) == 5
    assert add(-1, 1) == 0
    assert add(0, 0) == 0
    with pytest.raises(TypeError, match="Expects two integers"): 
        add("hello", 3)

def test_divide():
    with pytest.raises(ValueError, match="Cannot divide by zero"):
        divide(10, 0)
    with pytest.raises(TypeError, match="Expects two integers"): 
        divide("5", 3)
    assert divide(6, 2) == 3.0
    assert divide(1, 2) == 0.5
    assert divide(-1, 2) == -0.5
