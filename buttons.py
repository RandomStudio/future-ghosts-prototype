#!/usr/bin/env python3
"""
Simplified Raspberry Pi Button Handler with WebSocket
Serves static files and broadcasts GPIO events via WebSocket

Pin Configuration:
- Button 1: GPIO18 (Physical pin 12)
- Button 2: GPIO19 (Physical pin 35)

Requirements:
- pip3 install websockets --break-system-packages

Usage:
sudo python3 buttons.py
"""

import RPi.GPIO as GPIO
import asyncio
import websockets
import json
import time
from pathlib import Path
from http.server import SimpleHTTPRequestHandler
from socketserver import TCPServer
from threading import Thread

# Configuration
BUTTON_1_PIN = 18
BUTTON_2_PIN = 19
WS_PORT = 8765
HTTP_PORT = 8000

# Connected WebSocket clients
clients = set()

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
    
    # Broadcast to all connected WebSocket clients (synchronously)
    self.broadcast(json.dumps(message))

def broadcast(message):
    """Send message to all connected clients"""
    for client in list(clients):
        try:
            print("Sending message to connected clients")
            asyncio.run_coroutine_threadsafe(
                client.send(message), 
                asyncio.get_event_loop()
            )
            print("Sent message")
        except:
            pass  # Client disconnected, ignore

async def websocket_handler(websocket, path):
    """Handle WebSocket connections"""
    clients.add(websocket)
    print(f"✅ Client connected (total: {len(clients)})")
    
    try:
        # Send initial connection confirmation
        await websocket.send(json.dumps({
            "event": "CONNECTED",
            "message": "Button server ready",
            "timestamp": time.time()
        }))
        
        # Keep connection alive
        async for message in websocket:
            pass  # Echo or handle client messages if needed
            
    except websockets.exceptions.ConnectionClosed:
        pass
    finally:
        clients.remove(websocket)
        print(f"❌ Client disconnected (total: {len(clients)})")

async def start_websocket_server():
    """Start the WebSocket server"""
    # WebSocket server with permissive settings - no origin checking
    async with websockets.serve(
        websocket_handler, 
        "0.0.0.0", 
        WS_PORT,
        # Allow all origins, no restrictions
        origins=None,
        compression=None
    ):
        print(f"🌐 WebSocket server running on ws://0.0.0.0:{WS_PORT}")
        print(f"   CORS: Fully open, all origins allowed")
        await asyncio.Future()  # Run forever

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
    
    print(f"\n✨ Server ready!")
    print(f"   HTTP: http://0.0.0.0:{HTTP_PORT} (CORS: fully open)")
    print(f"   WebSocket: ws://0.0.0.0:{WS_PORT} (CORS: fully open)")
    print(f"\nPress Ctrl+C to exit\n")
    
    # Start WebSocket server (blocks)
    try:
        asyncio.run(start_websocket_server())
    except KeyboardInterrupt:
        print("\n\n👋 Shutting down...")
        GPIO.cleanup()
        print("Goodbye!")

if __name__ == "__main__":
    main()