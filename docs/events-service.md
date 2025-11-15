# 📡 Events Service

> 🚀 **Built for:** Real-time event monitoring, user notifications, and alert workflows  
> 🔧 **Tech Stack:** GraphQL, AWS Lambda, AWS IAM, Amazon Cognito  
> 📊 **Data Sources:** Amazon Pinpoint, Amazon Kinesis Firehose, Amazon S3  

## 🏷️ Enums

### 📊 EventType
Event classification types:

| Value | Description | Category |
|-------|-------------|----------|
| `SENSOR` | 📡 Sensor-based events | Hardware |
| `GENERIC` | 🔧 Generic system events | System |

### 🔄 EventState
Event state management:

| Value | Description | Status |
|-------|-------------|--------|
| `ACTIVE` | ✅ Event is active and requires attention | Active |
| `INACTIVE` | ❌ Event has been resolved or deactivated | Resolved |

### ⚠️ EventSeverity
Event severity levels:

| Value | Description | Priority |
|-------|-------------|----------|
| `LOW` | 🟢 Low priority event | Low |
| `MEDIUM` | 🟡 Medium priority event | Medium |
| `HIGH` | 🔴 High priority event | High |

### 📱 NotificationType
Notification delivery methods:

| Value | Description | Channel |
|-------|-------------|---------|
| `SMS` | 📱 SMS text message | Mobile |
| `EMAIL` | 📧 Email notification | Email |
| `PUSH` | 🔔 Push notification | Mobile App |

### 📊 NotificationState
Notification delivery status:

| Value | Description | Status |
|-------|-------------|--------|
| `OK` | ✅ Notification delivered successfully | Success |
| `MISSING_ENDPOINT` | ❌ Delivery endpoint not configured | Failed |

## 🔵 GraphQL

The Events Service provides GraphQL queries, mutations, and subscriptions for event monitoring and notifications.

**Note:** All GraphQL requests require a Cognito ID token in the `Authorization: Bearer <idToken>` header. See the API Overview section for authentication setup.

**Base URL:** Get the GraphQL endpoint from the endpoints configuration: `endpoints.GraphQL.events.https`

---

### 🔍 Queries

#### 📡 `devicesEventsList`
> **Lists events for a specific device.**

**Arguments:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `deviceId` | `ID!` | ✅ | The ID of the device |
| `period` | `TimePeriod` | ⚪ | Time range filter |
| `nextToken` | `String` | ⚪ | Pagination token |

**Returns:** `Events` - List of device events with pagination

**Example:**
```graphql
query GetDeviceEvents {
  devicesEventsList(
    deviceId: "DEVICE-ABC123-XYZ789"
    period: {
      startTimestamp: "1735689600000"
      endTimestamp: "1735776000000"
    }
  ) {
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
```

---

#### 🏢 `organizationsEventsList`
> **Lists events for all devices in an organization.**

**Arguments:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `organizationId` | `ID!` | ✅ | The ID of the organization |
| `period` | `TimePeriod` | ⚪ | Time range filter |
| `nextToken` | `String` | ⚪ | Pagination token |

**Returns:** `Events` - List of organization events with pagination

**Example:**
```graphql
query GetOrganizationEvents {
  organizationsEventsList(
    organizationId: "ORG-PROD-001"
    period: {
      startTimestamp: "1735689600000"
      endTimestamp: "1735776000000"
    }
  ) {
    events {
      deviceId
      timestamp
      eventId
      type
      severity
      displayName
    }
    nextToken
  }
}
```

---

#### 📋 `eventsMetadataList`
> **Lists available event metadata definitions.**

**Arguments:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `nextToken` | `String` | ⚪ | Pagination token |

**Returns:** `EventMetadataList` - List of event metadata with pagination

**Example:**
```graphql
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
```

---

#### 🔔 `notificationsSubscriptionsList`
> **Lists notification subscriptions for a user.**

**Arguments:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userId` | `ID!` | ✅ | The ID of the user |
| `organizationId` | `ID!` | ✅ | The ID of the organization |

**Returns:** `NotificationSubscriptions` - List of notification subscriptions

**Example:**
```graphql
query GetNotificationSubscriptions {
  notificationsSubscriptionsList(
    userId: "user-abc-123-def-456"
    organizationId: "ORG-PROD-001"
  ) {
    subscriptions {
      id
      userId
      organizationId
      eventIds
      type
      state
    }
  }
}
```

---

### ✏️ Mutations

#### ❌ `eventsDeactivate`
> **Deactivates an event (marks as resolved).**

**Arguments:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `payload` | `EventPayload!` | ✅ | Event deactivation data |

**Returns:** `Event` - Deactivated event

**Example:**
```graphql
mutation DeactivateEvent {
  eventsDeactivate(payload: {
    deviceId: "DEVICE-ABC123-XYZ789"
    timestamp: "1735689600000"
    eventId: "event-cloud-connected"
    eventState: INACTIVE
    organizationId: "ORG-PROD-001"
    type: GENERIC
    severity: MEDIUM
    displayName: "Device Connected"
  }) {
    deviceId
    eventId
    eventState
    updatedTimestamp
    organizationId
  }
}
```

---

#### ➕ `notificationsSubscriptionsCreate`
> **Creates a new notification subscription.**

**Arguments:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `subscriptionDetails` | `SubscriptionDetails!` | ✅ | Subscription configuration |

**Returns:** `NotificationSubscription` - Created subscription

**Example:**
```graphql
mutation CreateNotificationSubscription {
  notificationsSubscriptionsCreate(subscriptionDetails: {
    type: EMAIL
    userId: "user-abc-123-def-456"
    owningOrganization: "ORG-PROD-001"
    organizationId: "ORG-PROD-001"
    eventId: "event-cloud-connected"
  }) {
    id
    userId
    organizationId
    eventIds
    type
    state
  }
}
```

> **Note:** Subscriptions are managed per user and organization. Creating duplicate subscriptions for the same event may return service errors indicating existing coverage.

---

#### 🗑️ `notificationsSubscriptionsRemove`
> **Removes a notification subscription.**

**Arguments:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userId` | `ID!` | ✅ | The ID of the user |
| `subscriptionId` | `ID!` | ✅ | The ID of the subscription |

**Returns:** `UnsubscribeInfo` - Unsubscription details

**Example:**
```graphql
mutation RemoveNotificationSubscription {
  notificationsSubscriptionsRemove(
    userId: "user-abc-123-def-456"
    subscriptionId: "sub-abc-123-def-456"
  ) {
    subscription {
      id
      userId
      organizationId
      eventIds
      type
      state
    }
  }
}
```

---

### 💻 HTTP Request Examples

The following examples show how to make GraphQL queries and mutations using HTTP. Each example includes the complete authentication flow. For detailed authentication setup, token refresh, and error handling, see the API Overview section.

#### 🟨 Using JavaScript/fetch

```javascript
// Get endpoints and authenticate 
const response = await fetch("https://prod.api.harvia.io/endpoints");
const { endpoints } = await response.json();
const restApiGenerics = endpoints.RestApi.generics.https;
const graphqlEndpoint = endpoints.GraphQL.events.https;

const tokens = await fetch(`${restApiGenerics}/auth/token`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username: "your-username", password: "your-password" }),
}).then(r => r.json());

const idToken = tokens.idToken;

// Example query
const query = `
  query GetEvents {
    devicesEventsList(
      deviceId: "DEVICE-ABC123-XYZ789"
      period: {
        startTimestamp: "1735689600000"
        endTimestamp: "1735776000000"
      }
    ) {
      events {
        deviceId
        timestamp
        eventId
        type
        eventState
        severity
      }
      nextToken
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
graphql_endpoint = endpoints["GraphQL"]["events"]["https"]

tokens = requests.post(
    f"{rest_api_generics}/auth/token",
    headers={"Content-Type": "application/json"},
    json={"username": "your-username", "password": "your-password"}
).json()

id_token = tokens["idToken"]

# Example query
query = """
query GetEvents {
  devicesEventsList(
    deviceId: "DEVICE-ABC123-XYZ789"
    period: {
      startTimestamp: "1735689600000"
      endTimestamp: "1735776000000"
    }
  ) {
    events {
      deviceId
      timestamp
      eventId
      type
      eventState
      severity
    }
    nextToken
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
GRAPHQL=$(echo "$ENDPOINTS" | jq -r '.endpoints.GraphQL.events.https')

TOKEN_RESPONSE=$(curl -sS -H "Content-Type: application/json" \
  -X POST "$REST_API_GENERICS/auth/token" \
  --data '{"username":"your-username","password":"your-password"}')

ID_TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r '.idToken')

QUERY='{"query":"query GetEvents {\\n  devicesEventsList(\\n    deviceId: \\"DEVICE-ABC123-XYZ789\\"\\n    period: {\\n      startTimestamp: \\"1735689600000\\"\\n      endTimestamp: \\"1735776000000\\"\\n    }\\n  ) {\\n    events {\\n      deviceId\\n      timestamp\\n      eventId\\n      type\\n      eventState\\n      severity\\n    }\\n    nextToken\\n  }\\n}"}'

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

**Note:** Use the Cognito IdToken obtained via the REST API (see API Overview). Get endpoints from the Endpoints API; the client URL comes from `endpoints.GraphQL.events.https`. The `receiver` must be the JWT claim `cognito:username` from your IdToken.

#### 🔔 `eventsFeed`
> **Real-time feed of event notifications.**

**Arguments:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `receiver` | `ID!` | ✅ | The ID of the receiver |

**Returns:** `EventNotice` - Real-time event notifications

**Example:**
```graphql
subscription EventUpdates {
  eventsFeed(receiver: "user-abc-123-def-456") {
    receiver
    item {
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
const graphqlEndpoint = endpoints.GraphQL.events.https;

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

// Subscribe to events feed
const subscription = client.subscribe({
  query: gql`
    subscription EventsFeed {
      eventsFeed(receiver: "${userId}") {
        receiver
        item {
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
      }
    }
  `
});

subscription.subscribe({
  next: (data) => console.log("Received event:", data),
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
graphql_endpoint = endpoints["GraphQL"]["events"]["https"]

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
    'query': f'subscription EventsFeed {{ eventsFeed(receiver: "{user_id}") {{ receiver item {{ deviceId timestamp eventId type eventState severity sensorName sensorValue displayName }} }} }}',
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

### 📊 Event
> **Event representation**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `deviceId` | `ID!` | ✅ | Device ID |
| `timestamp` | `String!` | ✅ | Event timestamp |
| `eventId` | `ID` | ⚪ | Event ID |
| `organizationId` | `ID` | ⚪ | Organization ID |
| `updatedTimestamp` | `String` | ⚪ | Last update timestamp |
| `type` | `EventType` | ⚪ | Event type |
| `eventState` | `EventState` | ⚪ | Event state |
| `severity` | `EventSeverity` | ⚪ | Event severity |
| `sensorName` | `String` | ⚪ | Sensor name |
| `sensorValue` | `Float` | ⚪ | Sensor value |
| `metadata` | `String` | ⚪ | Additional metadata |
| `displayName` | `String` | ⚪ | Display name |

### 📋 EventMetadata
> **Event metadata definition**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `eventId` | `ID!` | ✅ | Event ID |
| `name` | `String` | ⚪ | Event name |
| `description` | `String` | ⚪ | Event description |

### 🔔 NotificationSubscription
> **Notification subscription**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `ID!` | ✅ | Subscription ID |
| `userId` | `ID!` | ✅ | User ID |
| `organizationId` | `ID!` | ✅ | Organization ID |
| `eventIds` | `[ID!]!` | ✅ | Subscribed event IDs |
| `type` | `NotificationType!` | ✅ | Notification type |
| `state` | `[NotificationState!]!` | ✅ | Subscription states |

### 📊 TimePeriod
> **Time range filter**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `startTimestamp` | `String!` | ✅ | Start timestamp |
| `endTimestamp` | `String!` | ✅ | End timestamp |

### 📋 SubscriptionDetails
> **Subscription creation details**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | `NotificationType!` | ✅ | Notification type |
| `userId` | `ID!` | ✅ | User ID |
| `owningOrganization` | `ID` | ⚪ | Owning organization |
| `organizationId` | `ID` | ⚪ | Organization ID |
| `eventId` | `ID` | ⚪ | Event ID |
| `deviceId` | `ID` | ⚪ | Device ID |

### 📊 Events
> **Paginated events list**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `events` | `[Event!]!` | ✅ | List of events |
| `nextToken` | `String` | ⚪ | Pagination token |

### 📋 EventMetadataList
> **Paginated event metadata list**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `eventMetadataItems` | `[EventMetadata!]!` | ✅ | List of event metadata |
| `nextToken` | `String` | ⚪ | Pagination token |

### 📦 NotificationSubscriptions
> **Notification subscriptions list**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `subscriptions` | `[NotificationSubscription!]!` | ✅ | List of notification subscriptions |
| `nextToken` | `ID` | ⚪ | Pagination token |

### 📢 EventNotice
> **Event notification**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `receiver` | `ID!` | ✅ | Receiver identifier |
| `item` | `Event!` | ✅ | Event data |

### 🗑️ UnsubscribeInfo
> **Unsubscribe information**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `subscription` | `NotificationSubscription` | ⚪ | Removed subscription details |

## 📋 Sample Responses

### ✅ Successful Query Response
```json
{
  "data": {
    "devicesEventsList": {
      "events": [
        {
          "deviceId": "DEVICE-ABC123-XYZ789",
          "timestamp": "1735689600000",
          "eventId": "event-cloud-connected",
          "type": "GENERIC",
          "eventState": "ACTIVE",
          "severity": "MEDIUM",
          "displayName": "Device Connected"
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
      "message": "Event not found",
      "locations": [{"line": 3, "column": 5}],
      "path": ["devicesEventsList"],
      "extensions": {
        "code": "EVENT_NOT_FOUND",
        "exception": {
          "stacktrace": ["Error: Event not found", "    at ..."]
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
query GetMoreEvents {
  devicesEventsList(
    deviceId: "DEVICE-ABC123-XYZ789"
    period: {
      startTimestamp: "1735689600000"
      endTimestamp: "1735776000000"
    }
    nextToken: "eyJsYXN0RXZhbHVhdGVkS2V5Ijp7InBhcnRpdGlvbl9rZXkiOnsic..."
  ) {
    events {
      deviceId
      timestamp
      eventId
      type
      severity
    }
    nextToken
  }
}
```

---

🌍 **Configuration Reference:** [Harvia Endpoints API](https://prod.api.harvia.io/endpoints)

📝 **Note: Always fetch the latest configuration to ensure you're using the current endpoints, regions, and client IDs. The configuration may change over time.**

---
