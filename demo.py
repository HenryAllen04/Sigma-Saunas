#!/usr/bin/env python3
"""
Harvia Sauna API Demo
Exercises all available API endpoints for Harvia sauna devices.
Configure credentials in .env file.
"""

import json
import os
import time
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

import requests
from dotenv import load_dotenv
from rich.console import Console
from rich.json import JSON
from rich.panel import Panel
from rich.table import Table

# Load environment variables
load_dotenv()

# Initialize Rich console
console = Console()


class HarviaAPI:
    """Client for interacting with Harvia Sauna API"""

    def __init__(self, username: str, password: str):
        self.username = username
        self.password = password
        self.endpoints_config = None
        self.id_token = None
        self.access_token = None
        self.refresh_token = None
        self.token_expiry = None

        # Fetch endpoints configuration
        self._fetch_endpoints()

        # Authenticate
        self._authenticate()

    def _fetch_endpoints(self):
        """Fetch API endpoints configuration"""
        console.print("\n[bold cyan]Fetching API Endpoints...[/bold cyan]")
        response = requests.get("https://prod.api.harvia.io/endpoints")
        response.raise_for_status()
        self.endpoints_config = response.json()["endpoints"]
        console.print("[green]✓[/green] Endpoints fetched successfully")

    def _authenticate(self):
        """Authenticate and get JWT tokens"""
        console.print("\n[bold cyan]Authenticating...[/bold cyan]")
        rest_api_base = self.endpoints_config["RestApi"]["generics"]["https"]

        response = requests.post(
            f"{rest_api_base}/auth/token",
            headers={"Content-Type": "application/json"},
            json={"username": self.username, "password": self.password},
        )
        response.raise_for_status()

        tokens = response.json()
        self.id_token = tokens["idToken"]
        self.access_token = tokens["accessToken"]
        self.refresh_token = tokens["refreshToken"]
        self.token_expiry = time.time() + tokens["expiresIn"]

        console.print(
            f"[green]✓[/green] Authenticated successfully (token expires in {tokens['expiresIn']}s)"
        )

    def refresh_tokens(self):
        """Refresh JWT tokens"""
        console.print("\n[bold cyan]Refreshing Tokens...[/bold cyan]")
        rest_api_base = self.endpoints_config["RestApi"]["generics"]["https"]

        response = requests.post(
            f"{rest_api_base}/auth/refresh",
            headers={"Content-Type": "application/json"},
            json={"refreshToken": self.refresh_token, "email": self.username},
        )
        response.raise_for_status()

        tokens = response.json()
        self.id_token = tokens["idToken"]
        self.access_token = tokens["accessToken"]
        self.token_expiry = time.time() + tokens["expiresIn"]

        console.print(f"[green]✓[/green] Tokens refreshed successfully")

    def revoke_token(self):
        """Revoke refresh token"""
        console.print("\n[bold cyan]Revoking Refresh Token...[/bold cyan]")
        rest_api_base = self.endpoints_config["RestApi"]["generics"]["https"]

        response = requests.post(
            f"{rest_api_base}/auth/revoke",
            headers={"Content-Type": "application/json"},
            json={"refreshToken": self.refresh_token, "email": self.username},
        )
        response.raise_for_status()

        result = response.json()
        console.print(f"[green]✓[/green] Token revoked: {result}")
        return result

    # ========== DEVICE SERVICE - REST API ==========

    def list_devices(self, max_results: int = 50):
        """List user's devices"""
        console.print("\n[bold cyan]Listing Devices (REST)...[/bold cyan]")
        rest_api_base = self.endpoints_config["RestApi"]["device"]["https"]

        response = requests.get(
            f"{rest_api_base}/devices?maxResults={max_results}",
            headers={"Authorization": f"Bearer {self.id_token}"},
        )
        response.raise_for_status()

        data = response.json()
        console.print(
            f"[green]✓[/green] Found {len(data.get('devices', []))} device(s)"
        )
        return data

    def send_device_command(
        self, device_id: str, command_type: str, state: str, cabin_id: str = "C1"
    ):
        """Send command to device"""
        console.print(
            f"\n[bold cyan]Sending Command to Device {device_id}...[/bold cyan]"
        )
        rest_api_base = self.endpoints_config["RestApi"]["device"]["https"]

        response = requests.post(
            f"{rest_api_base}/devices/command",
            headers={
                "Authorization": f"Bearer {self.id_token}",
                "Content-Type": "application/json",
            },
            json={
                "deviceId": device_id,
                "cabin": {"id": cabin_id},
                "command": {"type": command_type, "state": state},
            },
        )
        response.raise_for_status()

        data = response.json()
        console.print(f"[green]✓[/green] Command sent: {data}")
        return data

    def get_device_state(self, device_id: str, sub_id: str = "C1"):
        """Get device state (shadow)"""
        console.print(
            f"\n[bold cyan]Getting Device State for {device_id}...[/bold cyan]"
        )
        rest_api_base = self.endpoints_config["RestApi"]["device"]["https"]

        response = requests.get(
            f"{rest_api_base}/devices/state?deviceId={device_id}&subId={sub_id}",
            headers={"Authorization": f"Bearer {self.id_token}"},
        )
        response.raise_for_status()

        data = response.json()
        console.print(f"[green]✓[/green] Device state retrieved")
        return data

    def update_device_target(
        self,
        device_id: str,
        temperature: Optional[float] = None,
        humidity: Optional[float] = None,
        cabin_id: str = "C1",
    ):
        """Update device target temperature/humidity"""
        console.print(
            f"\n[bold cyan]Updating Device Target for {device_id}...[/bold cyan]"
        )
        rest_api_base = self.endpoints_config["RestApi"]["device"]["https"]

        payload = {"deviceId": device_id, "cabin": {"id": cabin_id}}
        if temperature is not None:
            payload["temperature"] = temperature
        if humidity is not None:
            payload["humidity"] = humidity

        response = requests.patch(
            f"{rest_api_base}/devices/target",
            headers={
                "Authorization": f"Bearer {self.id_token}",
                "Content-Type": "application/json",
            },
            json=payload,
        )
        response.raise_for_status()

        data = response.json()
        console.print(f"[green]✓[/green] Target updated: {data}")
        return data

    def update_device_profile(self, device_id: str, profile: str, cabin_id: str = "C1"):
        """Update device profile"""
        console.print(
            f"\n[bold cyan]Updating Device Profile for {device_id}...[/bold cyan]"
        )
        rest_api_base = self.endpoints_config["RestApi"]["device"]["https"]

        response = requests.patch(
            f"{rest_api_base}/devices/profile",
            headers={
                "Authorization": f"Bearer {self.id_token}",
                "Content-Type": "application/json",
            },
            json={"deviceId": device_id, "cabin": {"id": cabin_id}, "profile": profile},
        )
        response.raise_for_status()

        data = response.json()
        console.print(f"[green]✓[/green] Profile updated: {data}")
        return data

    # ========== DATA SERVICE - REST API ==========

    def get_latest_data(self, device_id: str, cabin_id: str = "C1"):
        """Get latest telemetry data"""
        console.print(
            f"\n[bold cyan]Getting Latest Data for {device_id}...[/bold cyan]"
        )
        rest_api_base = self.endpoints_config["RestApi"]["data"]["https"]

        response = requests.get(
            f"{rest_api_base}/data/latest-data?deviceId={device_id}&cabinId={cabin_id}",
            headers={"Authorization": f"Bearer {self.id_token}"},
        )
        response.raise_for_status()

        data = response.json()
        console.print(f"[green]✓[/green] Latest data retrieved")
        return data

    def get_telemetry_history(
        self,
        device_id: str,
        start_time: str,
        end_time: str,
        cabin_id: str = "C1",
        sampling_mode: Optional[str] = None,
        sample_amount: Optional[int] = None,
    ):
        """Get telemetry history"""
        console.print(
            f"\n[bold cyan]Getting Telemetry History for {device_id}...[/bold cyan]"
        )
        rest_api_base = self.endpoints_config["RestApi"]["data"]["https"]

        params = {
            "deviceId": device_id,
            "cabinId": cabin_id,
            "startTimestamp": start_time,
            "endTimestamp": end_time,
        }
        if sampling_mode:
            params["samplingMode"] = sampling_mode
        if sample_amount:
            params["sampleAmount"] = sample_amount

        query_string = "&".join(f"{k}={v}" for k, v in params.items())

        response = requests.get(
            f"{rest_api_base}/data/telemetry-history?{query_string}",
            headers={"Authorization": f"Bearer {self.id_token}"},
        )
        response.raise_for_status()

        data = response.json()
        console.print(
            f"[green]✓[/green] Telemetry history retrieved ({len(data.get('measurements', []))} measurements)"
        )
        return data

    # ========== GRAPHQL HELPER ==========

    def _graphql_request(
        self, service: str, query: str, variables: Optional[Dict] = None
    ):
        """Make a GraphQL request"""
        graphql_endpoint = self.endpoints_config["GraphQL"][service]["https"]

        response = requests.post(
            graphql_endpoint,
            headers={
                "Authorization": f"Bearer {self.id_token}",
                "Content-Type": "application/json",
            },
            json={"query": query, "variables": variables or {}},
        )
        response.raise_for_status()

        data = response.json()
        if "errors" in data:
            console.print(f"[red]GraphQL Errors: {data['errors']}[/red]")

        return data

    # ========== DEVICE SERVICE - GRAPHQL ==========

    def graphql_get_device(self, device_id: str):
        """Get device via GraphQL"""
        console.print(
            f"\n[bold cyan]Getting Device {device_id} (GraphQL)...[/bold cyan]"
        )

        query = """
        query GetDevice($deviceId: ID!) {
          devicesGet(deviceId: $deviceId) {
            id
            type
            attr {
              key
              value
            }
            roles
            via
          }
        }
        """

        data = self._graphql_request("device", query, {"deviceId": device_id})
        console.print(f"[green]✓[/green] Device retrieved via GraphQL")
        return data

    def graphql_list_user_devices(self):
        """List user's devices via GraphQL"""
        console.print(f"\n[bold cyan]Listing User Devices (GraphQL)...[/bold cyan]")

        query = """
        query ListMyDevices {
          usersDevicesList {
            devices {
              id
              type
              attr {
                key
                value
              }
              roles
              via
            }
            nextToken
          }
        }
        """

        data = self._graphql_request("device", query)
        devices = data.get("data", {}).get("usersDevicesList", {}).get("devices", [])
        console.print(f"[green]✓[/green] Found {len(devices)} device(s) via GraphQL")
        return data

    def graphql_get_device_state(self, device_id: str, shadow_name: str = "C1"):
        """Get device state via GraphQL"""
        console.print(
            f"\n[bold cyan]Getting Device State {device_id} (GraphQL)...[/bold cyan]"
        )

        query = """
        query GetDeviceState($deviceId: ID!, $shadowName: String) {
          devicesStatesGet(deviceId: $deviceId, shadowName: $shadowName) {
            deviceId
            shadowName
            desired
            reported
            timestamp
            version
            connectionState {
              connected
              updatedTimestamp
            }
          }
        }
        """

        data = self._graphql_request(
            "device", query, {"deviceId": device_id, "shadowName": shadow_name}
        )
        console.print(f"[green]✓[/green] Device state retrieved via GraphQL")
        return data

    # ========== DATA SERVICE - GRAPHQL ==========

    def graphql_get_latest_measurements(self, device_id: str):
        """Get latest measurements via GraphQL"""
        console.print(
            f"\n[bold cyan]Getting Latest Measurements {device_id} (GraphQL)...[/bold cyan]"
        )

        query = """
        query GetLatestMeasurements($deviceId: String!) {
          devicesMeasurementsLatest(deviceId: $deviceId) {
            deviceId
            subId
            timestamp
            sessionId
            type
            data
          }
        }
        """

        data = self._graphql_request("data", query, {"deviceId": device_id})
        measurements = data.get("data", {}).get("devicesMeasurementsLatest", [])
        console.print(
            f"[green]✓[/green] Retrieved {len(measurements)} measurement(s) via GraphQL"
        )
        return data

    def graphql_get_measurements_list(
        self,
        device_id: str,
        start_timestamp: str,
        end_timestamp: str,
        sampling_mode: str = "AVERAGE",
        sample_amount: int = 100,
    ):
        """Get measurements list via GraphQL"""
        console.print(
            f"\n[bold cyan]Getting Measurements List {device_id} (GraphQL)...[/bold cyan]"
        )

        query = """
        query GetDeviceMeasurements($deviceId: String!, $startTimestamp: String!,
                                    $endTimestamp: String!, $samplingMode: SamplingMode,
                                    $sampleAmount: Int) {
          devicesMeasurementsList(
            deviceId: $deviceId
            startTimestamp: $startTimestamp
            endTimestamp: $endTimestamp
            samplingMode: $samplingMode
            sampleAmount: $sampleAmount
          ) {
            measurementItems {
              deviceId
              subId
              timestamp
              sessionId
              type
              data
            }
            nextToken
          }
        }
        """

        data = self._graphql_request(
            "data",
            query,
            {
                "deviceId": device_id,
                "startTimestamp": start_timestamp,
                "endTimestamp": end_timestamp,
                "samplingMode": sampling_mode,
                "sampleAmount": sample_amount,
            },
        )
        items = (
            data.get("data", {})
            .get("devicesMeasurementsList", {})
            .get("measurementItems", [])
        )
        console.print(
            f"[green]✓[/green] Retrieved {len(items)} measurement(s) via GraphQL"
        )
        return data

    def graphql_get_sessions(
        self, device_id: str, start_timestamp: str, end_timestamp: str
    ):
        """Get device sessions via GraphQL"""
        console.print(
            f"\n[bold cyan]Getting Sessions {device_id} (GraphQL)...[/bold cyan]"
        )

        query = """
        query GetDeviceSessions($deviceId: String!, $startTimestamp: AWSDateTime!,
                               $endTimestamp: AWSDateTime!) {
          devicesSessionsList(
            deviceId: $deviceId
            startTimestamp: $startTimestamp
            endTimestamp: $endTimestamp
          ) {
            sessions {
              deviceId
              sessionId
              organizationId
              subId
              timestamp
              type
              durationMs
              stats
            }
            nextToken
          }
        }
        """

        data = self._graphql_request(
            "data",
            query,
            {
                "deviceId": device_id,
                "startTimestamp": start_timestamp,
                "endTimestamp": end_timestamp,
            },
        )
        sessions = (
            data.get("data", {}).get("devicesSessionsList", {}).get("sessions", [])
        )
        console.print(
            f"[green]✓[/green] Retrieved {len(sessions)} session(s) via GraphQL"
        )
        return data

    # ========== EVENTS SERVICE - GRAPHQL ==========

    def graphql_get_device_events(
        self,
        device_id: str,
        start_timestamp: Optional[str] = None,
        end_timestamp: Optional[str] = None,
    ):
        """Get device events via GraphQL"""
        console.print(
            f"\n[bold cyan]Getting Device Events {device_id} (GraphQL)...[/bold cyan]"
        )

        query = """
        query GetDeviceEvents($deviceId: ID!, $period: TimePeriod) {
          devicesEventsList(deviceId: $deviceId, period: $period) {
            events {
              deviceId
              timestamp
              eventId
              type
              eventState
              severity
              sensorName
              sensorValue
              displayName
            }
            nextToken
          }
        }
        """

        variables = {"deviceId": device_id}
        if start_timestamp and end_timestamp:
            variables["period"] = {
                "startTimestamp": start_timestamp,
                "endTimestamp": end_timestamp,
            }

        data = self._graphql_request("events", query, variables)
        events = data.get("data", {}).get("devicesEventsList", {}).get("events", [])
        console.print(f"[green]✓[/green] Retrieved {len(events)} event(s) via GraphQL")
        return data

    def graphql_get_event_metadata(self):
        """Get event metadata via GraphQL"""
        console.print(f"\n[bold cyan]Getting Event Metadata (GraphQL)...[/bold cyan]")

        query = """
        query GetEventMetadata {
          eventsMetadataList {
            eventMetadataItems {
              eventId
              name
              description
            }
            nextToken
          }
        }
        """

        data = self._graphql_request("events", query)
        items = (
            data.get("data", {})
            .get("eventsMetadataList", {})
            .get("eventMetadataItems", [])
        )
        console.print(
            f"[green]✓[/green] Retrieved {len(items)} event metadata item(s) via GraphQL"
        )
        return data


def display_devices(devices_data: Dict[str, Any]):
    """Display devices in a nice table"""
    devices = devices_data.get("devices", [])

    if not devices:
        console.print("[yellow]No devices found[/yellow]")
        return

    table = Table(title="Devices")
    table.add_column("Device ID", style="cyan")
    table.add_column("Type", style="magenta")
    table.add_column("Serial Number", style="green")
    table.add_column("Brand", style="yellow")

    for device in devices:
        # REST API uses 'name' for device ID, GraphQL uses 'id'
        device_id = device.get("id") or device.get("name", "N/A")
        device_type = device.get("type", "N/A")

        # Extract useful info from attributes
        serial_number = "N/A"
        brand = "N/A"
        for attr in device.get("attr", []):
            key = attr.get("key")
            if key == "serialNumber":
                serial_number = attr.get("value", "N/A")
            elif key == "brand":
                brand = attr.get("value", "N/A")

        table.add_row(device_id, device_type, serial_number, brand)

    console.print(table)


def main():
    """Main demo function"""
    console.print(
        Panel.fit(
            "[bold blue]Harvia Sauna API Demo[/bold blue]\n"
            "Exercising all available API endpoints",
            border_style="blue",
        )
    )

    # Load credentials from environment
    username = os.getenv("HARVIA_USERNAME")
    password = os.getenv("HARVIA_PASSWORD")

    if not username or not password:
        console.print(
            "[red]Error: HARVIA_USERNAME and HARVIA_PASSWORD must be set in .env file[/red]"
        )
        return

    try:
        # Initialize API client
        api = HarviaAPI(username, password)

        # ========== AUTHENTICATION DEMO ==========
        console.print("\n" + "=" * 60)
        console.print(Panel("[bold yellow]AUTHENTICATION ENDPOINTS[/bold yellow]"))
        console.print("=" * 60)

        # Already authenticated in __init__, demonstrate refresh
        api.refresh_tokens()

        # ========== DEVICE SERVICE REST DEMO ==========
        console.print("\n" + "=" * 60)
        console.print(Panel("[bold yellow]DEVICE SERVICE - REST API[/bold yellow]"))
        console.print("=" * 60)

        # List devices
        devices_data = api.list_devices()
        display_devices(devices_data)

        # Get first device ID for subsequent calls
        devices = devices_data.get("devices", [])
        if devices:
            # REST API uses 'name' field for device ID
            device_id = devices[0]["name"]
            console.print(f"\n[cyan]Using device: {device_id}[/cyan]")

            # Get device state
            state_data = api.get_device_state(device_id)
            console.print(
                Panel(JSON(json.dumps(state_data, indent=2)), title="Device State")
            )

            # Note: Commented out commands that would actually control the device
            # Uncomment these if you want to test device control
            # api.send_device_command(device_id, "SAUNA", "off")
            # api.update_device_target(device_id, temperature=80)
            # api.update_device_profile(device_id, "eco")

        # ========== DATA SERVICE REST DEMO ==========
        console.print("\n" + "=" * 60)
        console.print(Panel("[bold yellow]DATA SERVICE - REST API[/bold yellow]"))
        console.print("=" * 60)

        if devices:
            # Get latest data
            latest_data = api.get_latest_data(device_id)
            console.print(
                Panel(JSON(json.dumps(latest_data, indent=2)), title="Latest Data")
            )

            # Get telemetry history (last 24 hours)
            end_time = datetime.now()
            start_time = end_time - timedelta(days=1)

            history_data = api.get_telemetry_history(
                device_id,
                start_time.isoformat() + "Z",
                end_time.isoformat() + "Z",
                sampling_mode="average",
                sample_amount=60,
            )
            console.print(
                Panel(
                    JSON(json.dumps(history_data, indent=2)),
                    title=f"Telemetry History ({len(history_data.get('measurements', []))} measurements)",
                )
            )

        # ========== DEVICE SERVICE GRAPHQL DEMO ==========
        console.print("\n" + "=" * 60)
        console.print(Panel("[bold yellow]DEVICE SERVICE - GRAPHQL[/bold yellow]"))
        console.print("=" * 60)

        # List devices via GraphQL
        graphql_devices = api.graphql_list_user_devices()
        console.print(
            Panel(
                JSON(json.dumps(graphql_devices, indent=2)), title="Devices (GraphQL)"
            )
        )

        if devices:
            # Get specific device
            device_details = api.graphql_get_device(device_id)
            console.print(
                Panel(
                    JSON(json.dumps(device_details, indent=2)),
                    title="Device Details (GraphQL)",
                )
            )

            # Get device state
            device_state = api.graphql_get_device_state(device_id)
            console.print(
                Panel(
                    JSON(json.dumps(device_state, indent=2)),
                    title="Device State (GraphQL)",
                )
            )

        # ========== DATA SERVICE GRAPHQL DEMO ==========
        console.print("\n" + "=" * 60)
        console.print(Panel("[bold yellow]DATA SERVICE - GRAPHQL[/bold yellow]"))
        console.print("=" * 60)

        if devices:
            # Get latest measurements
            latest_measurements = api.graphql_get_latest_measurements(device_id)
            console.print(
                Panel(
                    JSON(json.dumps(latest_measurements, indent=2)),
                    title="Latest Measurements (GraphQL)",
                )
            )

            # Get measurements list (last 7 days)
            end_time = datetime.now()
            start_time = end_time - timedelta(days=7)

            measurements_list = api.graphql_get_measurements_list(
                device_id,
                str(int(start_time.timestamp() * 1000)),
                str(int(end_time.timestamp() * 1000)),
                sampling_mode="AVERAGE",
                sample_amount=100,
            )
            console.print(
                Panel(
                    JSON(json.dumps(measurements_list, indent=2)),
                    title="Measurements List (GraphQL)",
                )
            )

            # Get sessions
            sessions = api.graphql_get_sessions(
                device_id, start_time.isoformat() + "Z", end_time.isoformat() + "Z"
            )
            console.print(
                Panel(JSON(json.dumps(sessions, indent=2)), title="Sessions (GraphQL)")
            )

        # ========== EVENTS SERVICE GRAPHQL DEMO ==========
        console.print("\n" + "=" * 60)
        console.print(Panel("[bold yellow]EVENTS SERVICE - GRAPHQL[/bold yellow]"))
        console.print("=" * 60)

        # Get event metadata
        event_metadata = api.graphql_get_event_metadata()
        console.print(
            Panel(
                JSON(json.dumps(event_metadata, indent=2)),
                title="Event Metadata (GraphQL)",
            )
        )

        if devices:
            # Get device events (last 30 days)
            end_time = datetime.now()
            start_time = end_time - timedelta(days=30)

            events = api.graphql_get_device_events(
                device_id,
                str(int(start_time.timestamp() * 1000)),
                str(int(end_time.timestamp() * 1000)),
            )
            console.print(
                Panel(
                    JSON(json.dumps(events, indent=2)), title="Device Events (GraphQL)"
                )
            )

        # ========== COMPLETION ==========
        console.print("\n" + "=" * 60)
        console.print(
            Panel.fit(
                "[bold green]✓ Demo Complete![/bold green]\n"
                "All API endpoints exercised successfully",
                border_style="green",
            )
        )

        # Note: We're NOT revoking the token at the end so it can be reused
        # Uncomment the following line if you want to revoke the token
        # api.revoke_token()

    except requests.exceptions.HTTPError as e:
        console.print(f"\n[red]HTTP Error: {e}[/red]")
        console.print(f"[red]Response: {e.response.text}[/red]")
    except Exception as e:
        console.print(f"\n[red]Error: {e}[/red]")
        import traceback

        console.print(f"[red]{traceback.format_exc()}[/red]")


if __name__ == "__main__":
    main()
