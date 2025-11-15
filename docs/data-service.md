# 📊 Data Service

> 🚀 **Built for:** Real-time sauna monitoring and data analytics  
> 🔧 **Tech Stack:** GraphQL, AWS Lambda, AWS IAM, Amazon Cognito  
> 📊 **Data Sources:** AWS Timestream, InfluxDB, Amazon S3  

## 🏷️ Enums

### 📊 SamplingMode
Defines how measurement data should be sampled:

| Value | Description | Use Case |
|-------|-------------|----------|
| `NONE` | 📈 No sampling, return all data points | Real-time monitoring |
| `SAMPLING` | ⏱️ Sample data points at regular intervals | Performance optimization |
| `AVERAGE` | 📊 Calculate average values for intervals | Data analysis |

### 🗄️ DatabaseType
Specifies which database to use for queries:

| Value | Description | Best For |
|-------|-------------|----------|
| `timestream` | ⚡ AWS Timestream database | High-frequency IoT data |
| `influxdb` | 📈 InfluxDB database | Time-series analytics |

## 🌐 REST API

**Note:** All REST API endpoints require a Cognito ID token in the `Authorization: Bearer <idToken>` header. See the API Overview section for authentication setup.

**Base URL:** Get the REST API base URL from the endpoints configuration: `endpoints.RestApi.data.https`

---

#### 📊 `GET /data/latest-data`
> **Retrieves the most recent measurements for a specific device and cabin.**

**Arguments:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `deviceId` | `string` | ✅ | AWS IoT Thing name |
| `cabinId` | `string` | ⚪ | Sub-shadow identifier (e.g., `C1`). Mutually exclusive with `cabinName` |
| `cabinName` | `string` | ⚪ | Friendly cabin name advertised by the device. Mutually exclusive with `cabinId` |

**Notes:**
- If neither `cabinId` nor `cabinName` is provided, `cabinId` defaults to `C1`.

**Success Response (200):**
```json
{
  "deviceId": "ABC123",
  "shadowName": "C1",
  "subId": "C1",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "sessionId": "session-123",
  "type": "HEATER",
  "organization": "org-1",
  "data": {
    "temperature": 65.4,
    "humidity": 32.1
  }
}
```

**Error Response:**
```json
{
  "error": "string",
  "message": "string"
}
```

---

#### 📈 `GET /data/telemetry-history`
> **Retrieves a paginated list of measurements for a specific device and cabin within a time range.**

**Arguments:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `deviceId` | `string` | ✅ | AWS IoT Thing name |
| `cabinId` | `string` | ⚪ | Cabin/sub-shadow identifier (e.g., `C1`). Mutually exclusive with `cabinName` |
| `cabinName` | `string` | ⚪ | Friendly cabin name. Mutually exclusive with `cabinId` |
| `startTimestamp` | `string` | ✅ | Start of time range (ISO8601 string or epoch millis, inclusive) |
| `endTimestamp` | `string` | ✅ | End of time range (ISO8601 string or epoch millis, inclusive, must be ≥ `startTimestamp`) |
| `samplingMode` | `string` | ⚪ | Sampling mode: `none`, `sampling`, or `average` |
| `sampleAmount` | `integer` | ⚪ | Number of samples (required if `samplingMode` is supplied) |
| `nextToken` | `string` | ⚪ | Pagination token for continuing from a previous response |

**Notes:**
- If neither `cabinId` nor `cabinName` is provided, `cabinId` defaults to `C1`.
- Omit `samplingMode` to retrieve raw measurements.

**Success Response (200):**
```json
{
  "deviceId": "ABC123",
  "shadowName": "C1",
  "measurements": [
    {
      "deviceId": "ABC123",
      "subId": "C1",
      "timestamp": "1700000000000",
      "organizationId": "org-1",
      "deviceCanSee": ["org-1"],
      "data": {
        "temperature": 64.2,
        "humidity": 31.4
      },
      "sessionId": "session-123",
      "type": "HEATER"
    }
  ],
  "nextToken": "eyJwYWdlIjoiMiJ9"
}
```

**Error Response:**
```json
{
  "error": "string",
  "message": "string"
}
```

---

### 💡 REST API Examples

Each example below shows the complete authentication flow. For detailed authentication setup, token refresh, and error handling, see the API Overview section.

#### 🟨 Using JavaScript/fetch

```javascript
// Get endpoints and authenticate 
const response = await fetch("https://prod.api.harvia.io/endpoints");
const { endpoints } = await response.json();
const restApiBase = endpoints.RestApi.data.https;
const restApiGenerics = endpoints.RestApi.generics.https;

const tokens = await fetch(`${restApiGenerics}/auth/token`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username: "your-username", password: "your-password" }),
}).then(r => r.json());

const idToken = tokens.idToken;

async function call(method, path) {
  const res = await fetch(`${restApiBase}${path}`, {
    method,
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

// Fetch latest data for device ABC123, cabin C1
const latestData = await call("GET", `/data/latest-data?deviceId=ABC123&cabinId=C1`);
console.log(latestData);

// Fetch telemetry history for the same device between two timestamps
const start = new Date("2025-01-01T00:00:00.000Z").toISOString();
const end = new Date("2025-01-02T00:00:00.000Z").toISOString();
const telemetryHistory = await call(
  "GET",
  `/data/telemetry-history?deviceId=ABC123&cabinId=C1&startTimestamp=${encodeURIComponent(start)}&endTimestamp=${encodeURIComponent(end)}&samplingMode=average&sampleAmount=60`
);
console.log(telemetryHistory);
```

#### 🐍 Using Python/requests

```python
import requests

# Get endpoints and authenticate 
response = requests.get("https://prod.api.harvia.io/endpoints")
endpoints = response.json()["endpoints"]
rest_api_base = endpoints["RestApi"]["data"]["https"]
rest_api_generics = endpoints["RestApi"]["generics"]["https"]

tokens = requests.post(
    f"{rest_api_generics}/auth/token",
    headers={"Content-Type": "application/json"},
    json={"username": "your-username", "password": "your-password"}
).json()

id_token = tokens["idToken"]

def call(method, path):
    res = requests.request(method, f"{rest_api_base}{path}", headers={"Authorization": f"Bearer {id_token}"})
    if not res.ok:
        raise Exception(f"{res.status_code} {res.text}")
    return res.json()

# Fetch latest data for device ABC123, cabin C1
latest_data = call("GET", "/data/latest-data?deviceId=ABC123&cabinId=C1")
print(latest_data)

# Fetch telemetry history for the same device between two timestamps
start = "2025-01-01T00:00:00.000Z"
end = "2025-01-02T00:00:00.000Z"
telemetry_history = call(
    "GET",
    f"/data/telemetry-history?deviceId=ABC123&cabinId=C1&startTimestamp={start}&endTimestamp={end}&samplingMode=average&sampleAmount=60"
)
print(telemetry_history)
```

#### 🔧 Using cURL

```bash
# Get endpoints and authenticate 
ENDPOINTS=$(curl -sS "https://prod.api.harvia.io/endpoints")
REST_API_BASE=$(echo "$ENDPOINTS" | jq -r '.endpoints.RestApi.data.https')
REST_API_GENERICS=$(echo "$ENDPOINTS" | jq -r '.endpoints.RestApi.generics.https')

TOKEN_RESPONSE=$(curl -sS -H "Content-Type: application/json" \
  -X POST "$REST_API_GENERICS/auth/token" \
  --data '{"username":"your-username","password":"your-password"}')

ID_TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r '.idToken')

# Fetch latest data for device ABC123, cabin C1
curl -sS -H "Authorization: Bearer $ID_TOKEN" \
     "$REST_API_BASE/data/latest-data?deviceId=ABC123&cabinId=C1" | jq '.'

START_ISO="2025-01-01T00:00:00.000Z"
END_ISO="2025-01-02T00:00:00.000Z"

# Fetch telemetry history for the same device between two timestamps
curl -sS -H "Authorization: Bearer $ID_TOKEN" \
     "$REST_API_BASE/data/telemetry-history?deviceId=ABC123&cabinId=C1&startTimestamp=$START_ISO&endTimestamp=$END_ISO&samplingMode=average&sampleAmount=60" | jq '.'
```

---

## 🔵 GraphQL

The Data Service provides GraphQL queries and subscriptions for accessing device data.

**Note:** All GraphQL requests require a Cognito ID token in the `Authorization: Bearer <idToken>` header. See the API Overview section for authentication setup.

**Base URL:** Get the GraphQL endpoint from the endpoints configuration: `endpoints.GraphQL.data.https`

---

### 🔍 Queries

#### 📋 `devicesMeasurementsList`
> **Retrieves a paginated list of measurements for a specific device within a time range.**

**Arguments:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `deviceId` | `String!` | ✅ | The ID of the device |
| `startTimestamp` | `String!` | ✅ | Start of the time range |
| `endTimestamp` | `String!` | ✅ | End of the time range |
| `samplingMode` | `SamplingMode` | ⚪ | How to sample the data |
| `sampleAmount` | `Int` | ⚪ | Number of samples to return |
| `db` | `DatabaseType` | ⚪ | Database to query |
| `nextToken` | `String` | ⚪ | Pagination token |

**Returns:** `MeasurementItems` - List of measurements with pagination support

**Example:**
```graphql
query GetDeviceMeasurements {
  devicesMeasurementsList(
    deviceId: "DEVICE-ABC123-XYZ789"
    startTimestamp: "1735689600000"
    endTimestamp: "1735776000000"
    samplingMode: AVERAGE
    sampleAmount: 100
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
```

---

#### 📄 `devicesMeasurementsPdfGenerate`
> **Generates a PDF report of device measurements.**

**Arguments:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `deviceId` | `String!` | ✅ | The ID of the device |
| `startTimestamp` | `String!` | ✅ | Start of the time range |
| `endTimestamp` | `String!` | ✅ | End of the time range |
| `samplingMode` | `SamplingMode` | ⚪ | How to sample the data |
| `sampleAmount` | `Int` | ⚪ | Number of samples to return |
| `db` | `DatabaseType` | ⚪ | Database to query |

**Returns:** `PdfReportLink` - URL to the generated PDF report

**Example:**
```graphql
query GeneratePdfReport {
  devicesMeasurementsPdfGenerate(
    deviceId: "DEVICE-ABC123-XYZ789"
    startTimestamp: "1735689600000"
    endTimestamp: "1735776000000"
    samplingMode: AVERAGE
    sampleAmount: 1000
  ) {
    url
  }
}
```

---

#### ⚡ `devicesMeasurementsLatest`
> **Retrieves the most recent measurements for a device.**

**Arguments:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `deviceId` | `String!` | ✅ | The ID of the device |

**Returns:** `[MeasurementItem]` - Array of latest measurements

**Example:**
```graphql
query GetLatestMeasurements {
  devicesMeasurementsLatest(
    deviceId: "DEVICE-ABC123-XYZ789"
  ) {
    deviceId
    subId
    timestamp
    sessionId
    type
    data
  }
}
```

---

#### 🎯 `devicesSessionsList`
> **Retrieves a list of sessions for a specific device.**

**Arguments:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `deviceId` | `String!` | ✅ | The ID of the device |
| `startTimestamp` | `AWSDateTime!` | ✅ | Start of the time range |
| `endTimestamp` | `AWSDateTime!` | ✅ | End of the time range |
| `nextToken` | `String` | ⚪ | Pagination token |

**Returns:** `SessionItems` - List of sessions with pagination support

**Example:**
```graphql
query GetDeviceSessions {
  devicesSessionsList(
    deviceId: "DEVICE-ABC123-XYZ789"
    startTimestamp: "2025-01-01T00:00:00.000Z"
    endTimestamp: "2025-01-02T00:00:00.000Z"
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
```

---

#### 🏢 `organizationsSessionsList`
> **Retrieves a list of sessions for all devices in an organization.**

**Arguments:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `organizationId` | `String!` | ✅ | The ID of the organization |
| `startTimestamp` | `AWSDateTime!` | ✅ | Start of the time range |
| `endTimestamp` | `AWSDateTime!` | ✅ | End of the time range |
| `nextToken` | `String` | ⚪ | Pagination token |

**Returns:** `SessionItems` - List of sessions with pagination support

**Example:**
```graphql
query GetOrganizationSessions {
  organizationsSessionsList(
    organizationId: "ORG-PROD-001"
    startTimestamp: "2025-01-01T00:00:00.000Z"
    endTimestamp: "2025-01-02T00:00:00.000Z"
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
```

---

### 💻 HTTP Request Examples

The following examples show how to make GraphQL queries using HTTP. Each example includes the complete authentication flow. For detailed authentication setup, token refresh, and error handling, see the API Overview section.

#### 🟨 Using JavaScript/fetch

```javascript
// Get endpoints and authenticate 
const response = await fetch("https://prod.api.harvia.io/endpoints");
const { endpoints } = await response.json();
const restApiGenerics = endpoints.RestApi.generics.https;
const graphqlEndpoint = endpoints.GraphQL.data.https;

const tokens = await fetch(`${restApiGenerics}/auth/token`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username: "your-username", password: "your-password" }),
}).then(r => r.json());

const idToken = tokens.idToken;

const query = `
  query GetDeviceMeasurements {
    devicesMeasurementsLatest(
      deviceId: "DEVICE-ABC123-XYZ789"
    ) {
      deviceId
      subId
      timestamp
      sessionId
      type
      data
    }
  }
`;

const graphqlResponse = await fetch(graphqlEndpoint, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${idToken}`
  },
  body: JSON.stringify({ query })
});

const data = await graphqlResponse.json();
console.log(data);
```

#### 🐍 Using Python/requests

```python
import requests

# Get endpoints and authenticate 
response = requests.get("https://prod.api.harvia.io/endpoints")
endpoints = response.json()["endpoints"]
rest_api_generics = endpoints["RestApi"]["generics"]["https"]
graphql_endpoint = endpoints["GraphQL"]["data"]["https"]

tokens = requests.post(
    f"{rest_api_generics}/auth/token",
    headers={"Content-Type": "application/json"},
    json={"username": "your-username", "password": "your-password"}
).json()

id_token = tokens["idToken"]

query = """
query GetDeviceMeasurements {
  devicesMeasurementsLatest(
    deviceId: "DEVICE-ABC123-XYZ789"
  ) {
    deviceId
    subId
    timestamp
    sessionId
    type
    data
  }
}
"""

response = requests.post(
    graphql_endpoint,
    headers={
        'Content-Type': 'application/json',
        'Authorization': f"Bearer {id_token}"
    },
    json={'query': query}
)

data = response.json()
print(data)
```

#### 🔧 Using cURL

```bash
# Get endpoints and authenticate 
ENDPOINTS=$(curl -sS "https://prod.api.harvia.io/endpoints")
REST_API_GENERICS=$(echo "$ENDPOINTS" | jq -r '.endpoints.RestApi.generics.https')
GRAPHQL=$(echo "$ENDPOINTS" | jq -r '.endpoints.GraphQL.data.https')

TOKEN_RESPONSE=$(curl -sS -H "Content-Type: application/json" \
  -X POST "$REST_API_GENERICS/auth/token" \
  --data '{"username":"your-username","password":"your-password"}')

ID_TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r '.idToken')

QUERY='{"query":"query GetDeviceMeasurements {\\n  devicesMeasurementsLatest(\\n    deviceId: \"DEVICE-ABC123-XYZ789\"\\n  ) {\\n    deviceId\\n    subId\\n    timestamp\\n    sessionId\\n    type\\n    data\\n  }\\n}"}'

curl -sS -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ID_TOKEN" \
  -X POST "$GRAPHQL" \
  --data "$QUERY" | jq '.'
```

---

### 📡 Subscriptions

> **⚠️ Important**: Subscriptions are more complex than queries/mutations as they require WebSocket connections.

#### 🔧 **Setup Requirements**

**JavaScript/Node.js:**
```bash
npm install aws-appsync aws-appsync-auth-link graphql graphql-tag
```

**Note:** `aws-appsync` requires `graphql` version 14.x or 15.0.0–15.3.0 (not 16+). If you encounter compatibility issues, install with: `npm install aws-appsync aws-appsync-auth-link graphql@14 graphql-tag`

**Python:**
```bash
pip install requests websocket-client
```

**Note:** Use the Cognito IdToken obtained via the REST API (see API Overview). Get endpoints from the Endpoints API; the client URL comes from `endpoints.GraphQL.data.https`. The `receiver` must be the JWT claim `cognito:username` from your IdToken.

#### 🔔 `devicesMeasurementsUpdateFeed`
> **Real-time feed of measurement updates.**

**Arguments:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `receiver` | `ID!` | ✅ | The ID of the receiver |

**Returns:** `MeasurementUpdateNotice` - Real-time updates of measurements

**Example:**
```graphql
subscription SubscribeToMeasurements {
  devicesMeasurementsUpdateFeed(receiver: "user-abc-123-def-456") {
    receiver
    item {
      deviceId
      subId
      timestamp
      sessionId
      type
      data
    }
  }
}
```

---

### 📊 Subscription Examples

The following examples show complete subscription setup including authentication. For detailed authentication setup and token management, see the API Overview section.

#### 🟨 Using JavaScript/Node.js

```javascript
import { AWSAppSyncClient } from "aws-appsync";
import { AUTH_TYPE } from "aws-appsync-auth-link";
import gql from "graphql-tag";

// Get endpoints and authenticate 
const response = await fetch("https://prod.api.harvia.io/endpoints");
const { endpoints } = await response.json();
const restApiGenerics = endpoints.RestApi.generics.https;
const graphqlEndpoint = endpoints.GraphQL.data.https;

const tokens = await fetch(`${restApiGenerics}/auth/token`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username: "your-username", password: "your-password" }),
}).then(r => r.json());

const idToken = tokens.idToken;

// Extract user ID from JWT token (required for receiver argument)
const tokenPayload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString('utf-8'));
const userId = tokenPayload['cognito:username'];

// Create AppSync client
const client = new AWSAppSyncClient({
  url: graphqlEndpoint,
  region: "eu-central-1",
  auth: {
    type: AUTH_TYPE.AWS_LAMBDA,
    token: async () => `Bearer ${idToken}`,
  },
  disableOffline: true,
});

// Subscribe to measurements feed
const subscription = client.subscribe({
  query: gql`
    subscription MeasurementsFeed {
      devicesMeasurementsUpdateFeed(receiver: "${userId}") {
        receiver
        item {
          deviceId
          subId
          timestamp
          sessionId
          type
          data
        }
      }
    }
  `
});

subscription.subscribe({
  next: (data) => console.log("Received measurement:", data),
  error: (error) => console.error("Error:", error)
});
```

#### 🐍 Using Python/requests

```python
import json
import base64
import websocket
import requests
from uuid import uuid4

# Get endpoints and authenticate 
response = requests.get("https://prod.api.harvia.io/endpoints")
endpoints = response.json()["endpoints"]
rest_api_generics = endpoints["RestApi"]["generics"]["https"]
graphql_endpoint = endpoints["GraphQL"]["data"]["https"]

tokens = requests.post(
    f"{rest_api_generics}/auth/token",
    headers={"Content-Type": "application/json"},
    json={"username": "your-username", "password": "your-password"}
).json()

id_token = tokens["idToken"]

def header_encode(header_obj):
    """Encode header using Base 64"""
    return base64.b64encode(json.dumps(header_obj).encode('utf-8')).decode('utf-8')

# Extract user ID from JWT token
token_payload = json.loads(base64.b64decode(id_token.split('.')[1] + '==').decode('utf-8'))
user_id = token_payload['cognito:username']

# Build WebSocket URL and host
wss_url = graphql_endpoint.replace('https', 'wss').replace('appsync-api', 'appsync-realtime-api')
host = graphql_endpoint.replace('https://', '').replace('/graphql', '')

# Generate subscription ID
sub_id = str(uuid4())

# Create JWT authentication header
auth_header = {
    'host': host,
    'Authorization': f"Bearer {id_token}"
}

# GraphQL subscription
gql_subscription = json.dumps({
    'query': f'subscription MeasurementsFeed {{ devicesMeasurementsUpdateFeed(receiver: "{user_id}") {{ receiver item {{ deviceId subId timestamp sessionId type data }} }} }}',
    'variables': {}
})

# WebSocket event callbacks
def on_message(ws, message):
    message_object = json.loads(message)
    message_type = message_object['type']

    if message_type == 'connection_ack':
        # Register subscription
        register = {
            'id': sub_id,
            'payload': {
                'data': gql_subscription,
                'extensions': {'authorization': auth_header}
            },
            'type': 'start'
        }
        ws.send(json.dumps(register))

    elif message_type == 'start_ack':
        print("✅ Subscription registered successfully")

    elif message_type == 'data':
        print("✅ Received subscription data:", message_object['payload'])
        # Stop subscription
        ws.send(json.dumps({'type': 'stop', 'id': sub_id}))

def on_open(ws):
    ws.send(json.dumps({'type': 'connection_init'}))

# Create WebSocket connection
connection_url = wss_url + '?header=' + header_encode(auth_header) + '&payload=e30='
ws = websocket.WebSocketApp(
    connection_url,
    subprotocols=['graphql-ws'],
    on_open=on_open,
    on_message=on_message
)

# Run WebSocket (use proper threading/timeout handling)
ws.run_forever()
```

## 📋 Types

### 🔄 MeasurementUpdate
> **Input type for measurement updates**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `deviceId` | `String!` | ✅ | The ID of the device |
| `subId` | `String!` | ✅ | The ID of the subsystem |
| `timestamp` | `String!` | ✅ | Timestamp of the measurement |
| `sessionId` | `String` | ⚪ | ID of the session |
| `type` | `String` | ⚪ | Type of the measurement |
| `data` | `AWSJSON` | ⚪ | JSON data of the measurement |

### 📮 MeasurementUpdateNotice
> **Measurement update notifications**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `receiver` | `ID!` | ✅ | The ID of the receiver |
| `item` | `MeasurementItem!` | ✅ | The updated measurement |

### 🔥 Session
> **Sauna session representation**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `deviceId` | `String!` | ✅ | The ID of the device |
| `sessionId` | `String!` | ✅ | The ID of the session |
| `organizationId` | `String!` | ✅ | The ID of the organization |
| `subId` | `String!` | ✅ | The ID of the subsystem |
| `timestamp` | `AWSDateTime!` | ✅ | Timestamp of the session |
| `type` | `String` | ⚪ | Type of the session |
| `durationMs` | `Float` | ⚪ | Duration in milliseconds |
| `stats` | `AWSJSON` | ⚪ | Session statistics |

### 📊 SessionItems
> **Paginated session results**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sessions` | `[Session!]!` | ✅ | List of sessions |
| `nextToken` | `String` | ⚪ | Pagination token |

### 📈 MeasurementItem
> **Single measurement**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `deviceId` | `String!` | ✅ | The ID of the device |
| `subId` | `String!` | ✅ | The ID of the subsystem |
| `timestamp` | `String!` | ✅ | Timestamp of the measurement |
| `sessionId` | `String` | ⚪ | ID of the session |
| `type` | `String` | ⚪ | Type of the measurement |
| `data` | `AWSJSON` | ⚪ | JSON data of the measurement |

### 📋 MeasurementItems
> **Paginated measurement results**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `measurementItems` | `[MeasurementItem!]!` | ✅ | List of measurements |
| `nextToken` | `String` | ⚪ | Pagination token |

### 📄 PdfReportLink
> **PDF report link**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `url` | `String` | ⚪ | URL to the generated PDF report |

## 📋 Sample Responses

### ✅ Successful Query Response
```json
{
  "data": {
    "devicesMeasurementsList": {
      "measurementItems": [
        {
          "deviceId": "DEVICE-ABC123-XYZ789",
          "subId": "C1",
          "timestamp": "1735689600000",
          "sessionId": "session-456",
          "type": "temperature",
          "data": "{\"temp\": 80, \"hum\": 20, \"targetTemp\": 90}"
        }
      ],
      "nextToken": "eyJsYXN0RXZhbHVhdGVkS2V5Ijp7InBhcnRpdGlvbl9rZXkiOnsic..."
    }
  }
}
```

### ❌ Error Response
```json
{
  "errors": [
    {
      "message": "Device not found",
      "locations": [{"line": 3, "column": 5}],
      "path": ["devicesMeasurementsList"],
      "extensions": {
        "code": "DEVICE_NOT_FOUND",
        "exception": {
          "stacktrace": ["Error: Device not found", "    at ..."]
        }
      }
    }
  ],
  "data": null
}
```

---

### 📄 Pagination
For paginated results, use the `nextToken` from the response in subsequent requests:

```graphql
query GetMoreMeasurements {
  devicesMeasurementsList(
    deviceId: "DEVICE-ABC123-XYZ789"
    startTimestamp: "1735689600000"
    endTimestamp: "1735776000000"
    nextToken: "eyJsYXN0RXZhbHVhdGVkS2V5Ijp7InBhcnRpdGlvbl9rZXkiOnsic..."
  ) {
    measurementItems {
      deviceId
      subId
      timestamp
      data
    }
    nextToken
  }
}
```

---

🌍 **Configuration Reference:** [Harvia Endpoints API](https://prod.api.harvia.io/endpoints)

📝 **Note: Always fetch the latest configuration to ensure you're using the current endpoints, regions, and client IDs. The configuration may change over time.**

---
