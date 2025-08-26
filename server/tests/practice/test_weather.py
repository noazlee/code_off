# Mocks - when you want simple unit test for complex system - dont want it to be dependent on other variables
# Mock the component so we know we are only testing the function we are trying to test

import pytest
from weather import get_weather

def test_get_weather(mocker):
    # Mock requests.get
    mock_get = mocker.patch("weather.requests.get")

    # Set return values
    mock_get.return_value.status_code = 200
    mock_get.return_value.json.return_value = {"temperature": 25, "condition": "sunny"}
    
    # Call function
    result = get_weather("Dubai")

    # Assertions
    assert result == {"temperature": 25, "condition": "sunny"}
    mock_get.assert_called_once_with("https://api.weather.com/v1/Dubai")

