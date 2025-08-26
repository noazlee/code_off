# example for testing

def get_weather(temp):
    if temp > 20:
        return "hot"
    return "cold"

def add(a, b):
    if not isinstance(a, int) or not isinstance(b, int):
        raise TypeError("Expects two integers")
    return a + b

def divide(a, b):
    if b == 0:
        raise ValueError("Cannot divide by zero")
    if not isinstance(a, int) or not isinstance(b, int):
        raise TypeError("Expects two integers")
    return a / b