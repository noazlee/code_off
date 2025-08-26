import requests

def get_weather(city):
    response = requests.get(f"https://api.weather.com/v1/{city}")
    if response.status_code == 200:
        return response.json()
    raise ValueError("Could not fetch weather data")