#!/usr/bin/env python3
"""
Owntracks to Weather Bridge
Subscribes to owntracks/#, fetches weather on each location update
"""

import subprocess
import json
import sys

def get_weather(lat, lon):
    """Fetch weather for coordinates"""
    try:
        result = subprocess.run(
            ['curl', '-s', f'wttr.in/{lat},{lon}?format=%l:+%c+%t+(feels+like+%f),+%w+wind,+%h+humidity'],
            capture_output=True,
            text=True,
            timeout=10
        )
        return result.stdout.strip()
    except Exception as e:
        return f"Error fetching weather: {e}"

def process_message(topic, payload):
    """Process an Owntracks message"""
    try:
        data = json.loads(payload)
        if data.get('_type') == 'location':
            lat = data.get('lat')
            lon = data.get('lon')
            batt = data.get('batt', '?')
            
            if lat and lon:
                weather = get_weather(lat, lon)
                print(f"📍 Location Update (Battery: {batt}%)")
                print(f"🌤️  {weather}")
                print("---")
    except json.JSONDecodeError:
        pass

def main():
    """Read messages from stdin (piped from mosquitto_sub)"""
    print("🔌 Connected to Owntracks MQTT")
    print("Waiting for location updates...")
    print()
    
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
            
        # Parse topic and payload from mosquitto_sub -v output
        # Format: topic payload
        parts = line.split(' ', 1)
        if len(parts) == 2:
            topic, payload = parts
            process_message(topic, payload)

if __name__ == '__main__':
    main()
