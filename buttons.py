#!/usr/bin/env python3
"""
Raspberry Pi Physical Button Handler
Manages GPIO buttons for The Self Optimising Exhibition

Pin Configuration:
- Button Variant 1: Physical pins 1 (3.3V) and 12 (GPIO18)
- Button Variant 2: Physical pins 17 (3.3V) and 35 (GPIO19)

Requirements:
- Flask: sudo apt install python3-flask
- RPi.GPIO: sudo apt install python3-rpi.gpio
- flask-cors (optional): sudo apt install python3-flask-cors
  
Alternative installation methods:
- pip with --break-system-packages: pip3 install flask-cors --break-system-packages
- Using venv: python3 -m venv myenv && source myenv/bin/activate && pip install flask-cors

Usage:
sudo python3 buttons.py
"""

import RPi.GPIO as GPIO
import time
import json
from flask import Flask, jsonify
from threading import Thread
import os

# Try to import flask-cors, handle manually if not available
try:
    from flask_cors import CORS
    CORS_AVAILABLE = True
    print("✅ flask-cors is available")
except ImportError:
    print("ℹ️  flask-cors not installed - using manual CORS handling")
    CORS_AVAILABLE = False

# Flask app for web interface
app = Flask(__name__)

# Enable CORS
if CORS_AVAILABLE:
    CORS(app)  # Enable CORS for all routes
else:
    # Manual CORS handling
    @app.after_request
    def after_request(response):
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
        return response

# GPIO Pin Configuration (BCM numbering)
# Physical pin 12 = GPIO18, Physical pin 35 = GPIO19
BUTTON_VARIANT1_PIN = 18  # Physical pin 12
BUTTON_VARIANT2_PIN = 19  # Physical pin 35

# Button state tracking
button_states = {
    'variant1_pressed': False,
    'variant2_pressed': False,
    'last_press_time': 0
}

# Debounce settings
DEBOUNCE_TIME = 0.2  # 150ms debounce for faster response

def setup_gpio():
    """Initialize GPIO pins for buttons with improved error handling"""
    try:
        # Complete cleanup first to avoid conflicts
        print("Cleaning up any existing GPIO configuration...")
        try:
            GPIO.cleanup()
        except:
            pass
        
        time.sleep(0.5)  # Wait for cleanup to complete
        
        GPIO.setmode(GPIO.BCM)
        GPIO.setwarnings(False)
        
        print("Setting up GPIO pins...")
        # Setup buttons with internal pull-down resistors
        # Buttons connect pin to 3.3V when pressed
        GPIO.setup(BUTTON_VARIANT1_PIN, GPIO.IN, pull_up_down=GPIO.PUD_DOWN)
        GPIO.setup(BUTTON_VARIANT2_PIN, GPIO.IN, pull_up_down=GPIO.PUD_DOWN)
        
        # Wait for pins to stabilize
        time.sleep(0.2)
        
        # Setup interrupt handlers with better error handling
        print("Adding edge detection...")
        try:
            GPIO.add_event_detect(BUTTON_VARIANT1_PIN, GPIO.RISING, 
                                callback=button_variant1_callback, bouncetime=200)
            GPIO.add_event_detect(BUTTON_VARIANT2_PIN, GPIO.RISING, 
                                callback=button_variant2_callback, bouncetime=200)
        except RuntimeError as e:
            if "already added" in str(e).lower():
                print("Edge detection already exists - removing and re-adding...")
                GPIO.remove_event_detect(BUTTON_VARIANT1_PIN)
                GPIO.remove_event_detect(BUTTON_VARIANT2_PIN)
                time.sleep(0.5)
                
                GPIO.add_event_detect(BUTTON_VARIANT1_PIN, GPIO.RISING, 
                                    callback=button_variant1_callback, bouncetime=200)
                GPIO.add_event_detect(BUTTON_VARIANT2_PIN, GPIO.RISING, 
                                    callback=button_variant2_callback, bouncetime=200)
                print("Edge detection re-added successfully")
            else:
                raise e
        
        print("GPIO setup complete:")
        print(f"- Variant 1 button: GPIO{BUTTON_VARIANT1_PIN} (Physical pin 12)")
        print(f"- Variant 2 button: GPIO{BUTTON_VARIANT2_PIN} (Physical pin 35)")
        print("- Pull-down resistors enabled")
        print("- Buttons should connect pins to 3.3V when pressed")
        
    except Exception as e:
        print(f"Error setting up GPIO: {e}")
        print("Troubleshooting tips:")
        print("1. Make sure you're running with 'sudo'")
        print("2. Check if another process is using GPIO: sudo pkill -f python")
        print("3. Reboot if problems persist: sudo reboot")
        return False
    
    return True

def button_variant1_callback(channel):
    """Callback for variant 1 button press"""
    current_time = time.time()
    
    # Debounce check
    if current_time - button_states['last_press_time'] < DEBOUNCE_TIME:
        return
    
    button_states['last_press_time'] = current_time
    button_states['variant1_pressed'] = True
    
    print(f"[{time.strftime('%H:%M:%S')}] Physical Button 1 (Variant 1) pressed!")

def button_variant2_callback(channel):
    """Callback for variant 2 button press"""
    current_time = time.time()
    
    # Debounce check
    if current_time - button_states['last_press_time'] < DEBOUNCE_TIME:
        return
    
    button_states['last_press_time'] = current_time
    button_states['variant2_pressed'] = True
    
    print(f"[{time.strftime('%H:%M:%S')}] Physical Button 2 (Variant 2) pressed!")

@app.route('/check-button-press')
def check_button_press():
    """API endpoint to check for button presses"""
    global button_states
    
    response = {
        'button_pressed': False,
        'button_type': None,
        'timestamp': time.time()
    }
    
    # Check for variant 1 button press
    if button_states['variant1_pressed']:
        response['button_pressed'] = True
        response['button_type'] = 'variant1'
        button_states['variant1_pressed'] = False  # Reset state
        
    # Check for variant 2 button press
    elif button_states['variant2_pressed']:
        response['button_pressed'] = True
        response['button_type'] = 'variant2'
        button_states['variant2_pressed'] = False  # Reset state
    
    return jsonify(response)

@app.route('/button-status')
def button_status():
    """API endpoint to get current button status"""
    # Read current GPIO states
    try:
        variant1_state = GPIO.input(BUTTON_VARIANT1_PIN)
        variant2_state = GPIO.input(BUTTON_VARIANT2_PIN)
        gpio_working = True
    except Exception as e:
        variant1_state = 0
        variant2_state = 0
        gpio_working = False
    
    return jsonify({
        'variant1_current_state': variant1_state,
        'variant2_current_state': variant2_state,
        'variant1_pressed_flag': button_states['variant1_pressed'],
        'variant2_pressed_flag': button_states['variant2_pressed'],
        'last_press_time': button_states['last_press_time'],
        'gpio_setup': gpio_working
    })

@app.route('/gpio-info')
def gpio_info():
    """Debug endpoint to check GPIO status"""
    info = {
        'pins': {
            'variant1_pin': BUTTON_VARIANT1_PIN,
            'variant2_pin': BUTTON_VARIANT2_PIN
        },
        'states': button_states.copy(),
        'system_info': {}
    }
    
    # Check GPIO status
    try:
        import subprocess
        # Check for GPIO processes
        result = subprocess.run(['pgrep', '-f', 'buttons.py'], capture_output=True, text=True)
        info['system_info']['button_processes'] = result.stdout.strip().split('\n') if result.stdout.strip() else []
        
        # Check current user
        import os
        info['system_info']['current_user'] = os.getenv('USER', 'unknown')
        info['system_info']['running_as_sudo'] = os.geteuid() == 0 if hasattr(os, 'geteuid') else False
        
    except Exception as e:
        info['system_info']['error'] = str(e)
    
    return jsonify(info)

@app.route('/test-buttons')
def test_buttons():
    """Test endpoint to manually trigger button presses"""
    import random
    
    # Randomly trigger one of the buttons for testing
    test_button = random.choice(['variant1', 'variant2'])
    
    if test_button == 'variant1':
        button_states['variant1_pressed'] = True
        message = "Test: Variant 1 button triggered"
    else:
        button_states['variant2_pressed'] = True
        message = "Test: Variant 2 button triggered"
    
    button_states['last_press_time'] = time.time()
    
    return jsonify({
        'message': message,
        'test_button': test_button,
        'timestamp': time.time()
    })

def cleanup_gpio():
    """Clean up GPIO on exit"""
    try:
        GPIO.cleanup()
        print("GPIO cleanup complete")
    except:
        pass

def run_flask_app():
    """Run the Flask app in a separate thread"""
    app.run(host='0.0.0.0', port=5000, debug=False, use_reloader=False)

def main():
    """Main function"""
    print("=== Raspberry Pi Physical Button Handler ===")
    print("The Self Optimising Exhibition")
    print()
    
    # Check if running on Raspberry Pi
    try:
        with open('/proc/device-tree/model', 'r') as f:
            model = f.read().strip()
        print(f"Detected device: {model}")
    except:
        print("Warning: Not running on Raspberry Pi - GPIO functions may not work")
    
    print()
    print("Checking for existing GPIO processes...")
    # Check for other processes using GPIO
    import subprocess
    try:
        result = subprocess.run(['pgrep', '-f', 'buttons.py'], capture_output=True, text=True)
        if result.stdout.strip():
            print("Warning: Found other button processes running:")
            print(f"PIDs: {result.stdout.strip()}")
            print("Kill them with: sudo pkill -f buttons.py")
    except:
        pass
    
    # Setup GPIO
    if not setup_gpio():
        print("Failed to setup GPIO. Exiting.")
        return
    
    # Start Flask server in background thread
    flask_thread = Thread(target=run_flask_app, daemon=True)
    flask_thread.start()
    
    print()
    print("Physical button server started!")
    print(f"- Flask server running on http://0.0.0.0:5000")
    print("- CORS enabled for cross-origin requests")
    print("- Endpoints available:")
    print("  * /check-button-press - Check for button presses")
    print("  * /button-status - Get current button status")
    print("  * /test-buttons - Test button functionality")
    print("  * /gpio-info - Debug GPIO information")
    print()
    print("Press Ctrl+C to exit")
    
    try:
        # Keep the main thread alive
        while True:
            time.sleep(1)
            
    except KeyboardInterrupt:
        print("\nShutting down...")
        cleanup_gpio()
        print("Goodbye!")

if __name__ == "__main__":
    main()