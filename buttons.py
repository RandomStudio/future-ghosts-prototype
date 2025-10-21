#!/usr/bin/env python3
"""
Simplified Raspberry Pi Button Handler with WebSocket
Serves static files and broadcasts GPIO events via WebSocket

Pin Configuration:
- Button 1: GPIO18 (Physical pin 12)
- Button 2: GPIO19 (Physical pin 35)

Requirements:
- pip3 install simple-websocket-server --break-system-packages

Usage:
sudo python3 buttons.py
"""

import RPi.GPIO as GPIO
import json
import time
from http.server import SimpleHTTPRequestHandler
from socketserver import TCPServer
from threading import Thread
from simple_websocket_server import WebSocketServer, WebSocket

# Configuration
BUTTON_1_PIN = 18
BUTTON_2_PIN = 19
WS_PORT = 8765
HTTP_PORT = 8000

# Connected WebSocket clients
clients = []

class ButtonWebSocket(WebSocket):
    def handle(self):
        """Handle incoming messages"""
        pass  # We only send, don't need to handle incoming
    
    def connected(self):
        """Called when client connects"""
        clients.append(self)
        print(f"✅ Client connected (total: {len(clients)})")
        
        # Send connection confirmation
        self.send_message(json.dumps({
            "event": "CONNECTED",
            "message": "Button server ready",
            "timestamp": time.time()
        }))
    
    def handle_close(self):
        """Called when client disconnects"""
        if self in clients:
            clients.remove(self)
        print(f"❌ Client disconnected (total: {len(clients)})")

def setup_gpio():
    """Initialize GPIO pins"""
    GPIO.setmode(GPIO.BCM)
    GPIO.setwarnings(False)
    GPIO.setup(BUTTON_1_PIN, GPIO.IN, pull_up_down=GPIO.PUD_DOWN)
    GPIO.setup(BUTTON_2_PIN, GPIO.IN, pull_up_down=GPIO.PUD_DOWN)
    
    # Setup edge detection for both rising and falling edges
    GPIO.add_event_detect(BUTTON_1_PIN, GPIO.BOTH, 
                         callback=lambda ch: handle_button_event(1, ch), 
                         bouncetime=50)
    GPIO.add_event_detect(BUTTON_2_PIN, GPIO.BOTH, 
                         callback=lambda ch: handle_button_event(2, ch), 
                         bouncetime=50)
    
    print(f"✅ GPIO setup complete")
    print(f"   Button 1: GPIO{BUTTON_1_PIN}")
    print(f"   Button 2: GPIO{BUTTON_2_PIN}")

def handle_button_event(button_num, channel):
    """Handle button press/release events"""
    state = GPIO.input(channel)
    event_type = "PRESSED" if state == GPIO.HIGH else "RELEASED"
    
    message = {
        "event": event_type,
        "button": button_num,
        "state": event_type,
        "timestamp": time.time()
    }
    
    print(f"[{time.strftime('%H:%M:%S')}] Button {button_num}: {event_type}")
    
    # Broadcast to all connected WebSocket clients
    broadcast(json.dumps(message))

def broadcast(message):
    """Send message to all connected clients"""
    for client in clients[:]:  # Copy list to avoid modification during iteration
        try:
            client.send_message(message)
        except:
            # Client disconnected, remove it
            if client in clients:
                clients.remove(client)

def start_websocket_server():
    """Start the WebSocket server"""
    server = WebSocketServer('0.0.0.0', WS_PORT, ButtonWebSocket)
    print(f"🌐 WebSocket server running on ws://0.0.0.0:{WS_PORT}")
    print(f"   CORS: Fully open, all origins allowed")
    server.serve_forever()

def start_http_server():
    """Start simple HTTP server for static files"""
    class Handler(SimpleHTTPRequestHandler):
        def log_message(self, format, *args):
            pass  # Suppress log messages
        
        def end_headers(self):
            # Add CORS headers to all responses
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', '*')
            self.send_header('Access-Control-Allow-Headers', '*')
            self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
            super().end_headers()
        
        def do_OPTIONS(self):
            # Handle preflight requests
            self.send_response(200)
            self.end_headers()
    
    with TCPServer(("0.0.0.0", HTTP_PORT), Handler) as httpd:
        print(f"📁 HTTP server running on http://0.0.0.0:{HTTP_PORT}")
        httpd.serve_forever()

def main():
    print("=== Simplified Button WebSocket Server ===\n")
    
    # Setup GPIO
    try:
        setup_gpio()
    except Exception as e:
        print(f"❌ GPIO setup failed: {e}")
        print("   Make sure to run with: sudo python3 buttons.py")
        return
    
    # Start HTTP server in background thread
    http_thread = Thread(target=start_http_server, daemon=True)
    http_thread.start()
    
    # Start WebSocket server in background thread
    ws_thread = Thread(target=start_websocket_server, daemon=True)
    ws_thread.start()
    
    print(f"\n✨ Server ready!")
    print(f"   HTTP: http://0.0.0.0:{HTTP_PORT} (CORS: fully open)")
    print(f"   WebSocket: ws://0.0.0.0:{WS_PORT} (CORS: fully open)")
    print(f"\nPress Ctrl+C to exit\n")
    
    # Keep main thread alive
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n\n👋 Shutting down...")
        GPIO.cleanup()
        print("Goodbye!")

if __name__ == "__main__":
    main()