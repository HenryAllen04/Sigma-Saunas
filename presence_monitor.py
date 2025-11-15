#!/usr/bin/env python3
"""
Harvia Sauna Motion Monitor
Polls the API and logs motion detection changes.
Uses PIR sensor data - detects movement, not static presence.
"""

import os
import time
from datetime import datetime
from typing import Optional

import requests
from dotenv import load_dotenv
from rich.console import Console
from rich.panel import Panel

# Load environment variables
load_dotenv()

# Initialize Rich console
console = Console()


class MotionMonitor:
    """Monitor sauna motion detection (PIR sensor)"""

    def __init__(self, username: str, password: str, poll_interval: int = 5):
        self.username = username
        self.password = password
        self.poll_interval = poll_interval
        self.endpoints_config = None
        self.id_token = None
        self.token_expiry = None
        self.device_id = None
        self.last_motion_value = None
        self.last_motion_time = None
        self.last_nonzero_time = None

        # Fetch endpoints and authenticate
        self._fetch_endpoints()
        self._authenticate()
        self._get_device_id()

    def _fetch_endpoints(self):
        """Fetch API endpoints configuration"""
        response = requests.get("https://prod.api.harvia.io/endpoints")
        response.raise_for_status()
        self.endpoints_config = response.json()["endpoints"]

    def _authenticate(self):
        """Authenticate and get JWT tokens"""
        rest_api_base = self.endpoints_config["RestApi"]["generics"]["https"]

        response = requests.post(
            f"{rest_api_base}/auth/token",
            headers={"Content-Type": "application/json"},
            json={"username": self.username, "password": self.password},
        )
        response.raise_for_status()

        tokens = response.json()
        self.id_token = tokens["idToken"]
        self.token_expiry = time.time() + tokens["expiresIn"]

    def _refresh_token_if_needed(self):
        """Refresh token if it's about to expire"""
        if time.time() >= self.token_expiry - 300:  # Refresh 5 minutes before expiry
            rest_api_base = self.endpoints_config["RestApi"]["generics"]["https"]

            response = requests.post(
                f"{rest_api_base}/auth/refresh",
                headers={"Content-Type": "application/json"},
                json={"refreshToken": self.refresh_token, "email": self.username},
            )
            response.raise_for_status()

            tokens = response.json()
            self.id_token = tokens["idToken"]
            self.token_expiry = time.time() + tokens["expiresIn"]

    def _get_device_id(self):
        """Get the first device ID"""
        rest_api_base = self.endpoints_config["RestApi"]["device"]["https"]

        response = requests.get(
            f"{rest_api_base}/devices?maxResults=1",
            headers={"Authorization": f"Bearer {self.id_token}"},
        )
        response.raise_for_status()

        devices = response.json().get("devices", [])
        if not devices:
            raise Exception("No devices found")

        self.device_id = devices[0]["name"]
        console.print(f"[cyan]Monitoring device: {self.device_id}[/cyan]")

    def get_motion_value(self) -> Optional[int]:
        """Get current motion sensor value"""
        self._refresh_token_if_needed()

        rest_api_base = self.endpoints_config["RestApi"]["data"]["https"]

        response = requests.get(
            f"{rest_api_base}/data/latest-data?deviceId={self.device_id}&cabinId=C1",
            headers={"Authorization": f"Bearer {self.id_token}"},
        )
        response.raise_for_status()

        data = response.json()
        return data.get("data", {}).get("presence")

    def format_time_since(self, seconds: float) -> str:
        """Format seconds into human-readable time"""
        if seconds < 60:
            return f"{int(seconds)} seconds"
        elif seconds < 3600:
            minutes = int(seconds / 60)
            return f"{minutes} minute{'s' if minutes != 1 else ''}"
        else:
            hours = int(seconds / 3600)
            minutes = int((seconds % 3600) / 60)
            if minutes > 0:
                return f"{hours} hour{'s' if hours != 1 else ''} {minutes} minute{'s' if minutes != 1 else ''}"
            return f"{hours} hour{'s' if hours != 1 else ''}"

    def log_motion_change(self, old_value: Optional[int], new_value: int):
        """Log motion change with timestamp"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        current_time = time.time()

        # Update last motion time if we detect motion
        if new_value > 0:
            self.last_nonzero_time = current_time

        if old_value is None:
            # Initial state
            if new_value == 0:
                console.print(
                    f"[{timestamp}] [yellow]Initial state: No motion detected[/yellow]"
                )
            else:
                console.print(
                    f"[{timestamp}] [yellow]Initial state: Motion detected ({new_value})[/yellow]"
                )
                self.last_nonzero_time = current_time

        elif old_value == 0 and new_value > 0:
            # Motion started
            if self.last_nonzero_time and current_time - self.last_nonzero_time > 30:
                time_since = self.format_time_since(current_time - self.last_nonzero_time)
                console.print(
                    f"[{timestamp}] [bold green]🚶 Motion detected ({new_value})[/bold green] - Last motion: {time_since} ago"
                )
            else:
                console.print(
                    f"[{timestamp}] [bold green]🚶 Motion detected ({new_value})[/bold green]"
                )

        elif old_value > 0 and new_value == 0:
            # Motion stopped
            if self.last_nonzero_time:
                console.print(
                    f"[{timestamp}] [yellow]⚠️  No motion detected[/yellow] - Person may still be present but sitting still"
                )

        elif old_value > 0 and new_value > 0:
            # Motion value changed
            if new_value > old_value:
                console.print(
                    f"[{timestamp}] [green]Movement increasing ({old_value} → {new_value})[/green]"
                )
            else:
                console.print(
                    f"[{timestamp}] [cyan]Movement decreasing ({old_value} → {new_value})[/cyan]"
                )

    def monitor(self):
        """Main monitoring loop"""
        console.print(
            Panel.fit(
                "[bold blue]Harvia Sauna Motion Monitor[/bold blue]\n"
                f"PIR sensor - detects movement, not static presence\n"
                f"Polling every {self.poll_interval} seconds",
                border_style="blue",
            )
        )

        last_warning_time = None
        warning_interval = 30  # Show warning every 30 seconds

        while True:
            try:
                motion_value = self.get_motion_value()
                current_time = time.time()

                if motion_value != self.last_motion_value:
                    self.log_motion_change(self.last_motion_value, motion_value)
                    self.last_motion_value = motion_value
                    last_warning_time = None  # Reset warning timer on any change

                # Periodic status update when no motion for a while
                elif (
                    motion_value == 0
                    and self.last_nonzero_time
                    and current_time - self.last_nonzero_time >= warning_interval
                ):
                    if (
                        last_warning_time is None
                        or current_time - last_warning_time >= warning_interval
                    ):
                        time_since = self.format_time_since(
                            current_time - self.last_nonzero_time
                        )
                        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                        console.print(
                            f"[{timestamp}] [dim]Last motion: {time_since} ago[/dim]"
                        )
                        last_warning_time = current_time

                time.sleep(self.poll_interval)

            except KeyboardInterrupt:
                console.print("\n[yellow]Monitoring stopped by user[/yellow]")
                break
            except Exception as e:
                timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                console.print(f"[{timestamp}] [red]Error: {e}[/red]")
                time.sleep(self.poll_interval)


def main():
    """Main entry point"""
    # Load credentials from environment
    username = os.getenv("HARVIA_USERNAME")
    password = os.getenv("HARVIA_PASSWORD")
    poll_interval = int(os.getenv("POLL_INTERVAL", "5"))

    if not username or not password:
        console.print(
            "[red]Error: HARVIA_USERNAME and HARVIA_PASSWORD must be set in .env file[/red]"
        )
        return

    try:
        monitor = MotionMonitor(username, password, poll_interval)
        monitor.monitor()
    except Exception as e:
        console.print(f"[red]Fatal error: {e}[/red]")
        import traceback

        console.print(f"[red]{traceback.format_exc()}[/red]")


if __name__ == "__main__":
    main()
