# ![MyHarvia Logo](assets/harvia-logos/512.png) MyHarvia Cloud API Specification

![GraphQL](https://img.shields.io/badge/GraphQL-E10098?style=for-the-badge&logo=graphql&logoColor=white)
![AWS](https://img.shields.io/badge/AWS-232F3E?style=for-the-badge&logo=amazon-aws&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)

---

>**Harvia API — Initial Release, v 0.5.0 - 031125**  
>We’re publishing the first public release of the Harvia API. This is an early developer release: we invite you to explore, integrate, and provide feedback.  
>The API will continue to evolve as we add capabilities and add schemas. We are also evaluating alternative API approaches — including MQTT-based communication, AI-compatible data interfaces, and other modern integration models. Our goal is to ensure long-term interoperability, efficiency, and ease of use across both embedded and cloud environments. 
>We strive to maintain backward compatibility; when changes are necessary, we will announce them in advance and provide clear migration guidance through our documentation and changelog.

## 📋 Overview

This document covers the MyHarvia Cloud API specification with 3 services and their APIs, authentication setup, and configuration.

- **Authentication** - REST API authentication and JWT token management via the public REST API
- **API Services**:
  - **Data Service** - Device measurements and session data (REST API + GraphQL)
  - **Device Service** - Device management and control (REST API + GraphQL)
  - **Events Service** - Event monitoring and notifications (GraphQL)

**API Types:**
- **REST API** - RESTful endpoints for specific operations (available in Data & Device Services)
- **GraphQL** - Query, mutation, and subscription operations (available in all services)

**Available Endpoints:**
- **REST API endpoints** - Standard HTTP REST endpoints (Data & Device Services)
- **GraphQL HTTPS endpoint** - For standard GraphQL queries and mutations (all services)
- **GraphQL WebSocket endpoint** - For real-time GraphQL subscriptions (all services)
- **GraphQL Schema URL** - For downloading the GraphQL schema (all services)  

## 📋 REST API Operations

### 🔐 Authentication

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/token` | `POST` | Username & password-based login, returns tokens (valid for 1 hour) for API access |
| `/auth/refresh` | `POST` | Refresh tokens to extend API access |
| `/auth/revoke` | `POST` | Revoke refresh tokens |

### 🔧 Device Service

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/devices` | `GET` | List user's devices |
| `/devices/command` | `POST` | Send command to a device |
| `/devices/state` | `GET` | Get device state (shadow) |
| `/devices/target` | `PATCH` | Set target temperature & humidity |
| `/devices/profile` | `PATCH` | Change device profile |

### 📊 Data Service

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/data/latest-data` | `GET` | Get latest telemetry data |
| `/data/telemetry-history` | `GET` | Get telemetry history for a time range |

## 🔐 Authentication

The APIs use **AWS Cognito** for authentication via JWT tokens. All API endpoints require JWT token authentication. Authentication is handled through the **public REST API** which provides token endpoints.

| Authorization Type | Description | Usage |
|-------------------|-------------|-------|
| **JWT Token** | Cognito authentication via REST API | **All API access** |

Fetch API configuration first to obtain the REST API base URL and GraphQL endpoints. Use the REST API `/auth/token` endpoint to obtain JWT tokens.

---

### 🌐 API Endpoint Configuration

**Endpoint:** https://prod.api.harvia.io/endpoints

This endpoint returns the values required for authentication and service requests.

**API Response Example:**
```json
{
  "endpoints": {
    "RestApi": {
      "generics": {
        "https": "https://xxxxxxxxxx.execute-api.eu-central-1.amazonaws.com/prod"
      },
      "data": {
        "https": "https://xxxxxxxxxx.execute-api.eu-central-1.amazonaws.com/prod"
      },
      "device": {
        "https": "https://xxxxxxxxxx.execute-api.eu-central-1.amazonaws.com/prod"
      },
      "users": {
        "https": "https://xxxxxxxxxx.execute-api.eu-central-1.amazonaws.com/prod"
      }
    },
    "version": "6.31.2",
    "Config": {
      "IoTCoreCredentialsEndpoint": "c9d0zb4dt5fpm.credentials.iot.eu-central-1.amazonaws.com",
      "UserPoolId": "eu-central-1_PYox3qeLn",
      "Region": "eu-central-1",
      "AnalyticsDashboardId": "",
      "IdentityPoolId": "eu-central-1:c6b64717-a29e-4695-8ce4-97c93470da8a",
      "IotCoreEndpoint": "ab4fm8yv2cf3g-ats.iot.eu-central-1.amazonaws.com",
      "PinpointAnalyticsLevel": "medium",
      "AuthType": "AMAZON_COGNITO_USER_POOLS",
      "Clients": [
        {
          "name": "harvia-eos-generics-harvia-client",
          "id": "1cq6ttro3ug8u0h2qbu9ltjb7o"
        },
        {
          "name": "harvia-eos-generics-eos-client",
          "id": "2m6409shai9f9isotj1jhstcfp"
        },
        {
          "name": "harvia-eos-generics-eos-web-client",
          "id": "u3rf9f4n4bec1eouni4nc1e7t"
        }
      ],
      "Urls": {
        "eos": {
          "eula": {
            "en": "https://cdn.harvia.io/legal/harvia/eula/en.html"
          },
          "privacyPolicy": {
            "en": "https://cdn.harvia.io/legal/harvia/privacyPolicy/en.html"
          },
          "termsOfUse": {
            "en": "https://cdn.harvia.io/legal/harvia/termsOfUse/en.html"
          }
        },
        "harvia": {
          "eula": {
            "en": "https://cdn.harvia.io/legal/harvia/eula/en.html"
          },
          "privacyPolicy": {
            "en": "https://cdn.harvia.io/legal/harvia/privacyPolicy/en.html"
          },
          "termsOfUse": {
            "en": "https://cdn.harvia.io/legal/harvia/termsOfUse/en.html"
          }
        },
        "termsOfUse": "https://www.harvia.com/en/legal-disclaimer/",
        "privacyPolicy": "https://www.harvia.com/en/privacy-notice/"
      },
      "PinpointAnalyticsProjectId": "c14a452512604dc89241987f873d14d3"
    },
    "DataPipeline": {
      "TelemetryIngestionEndpoint": "https://firehose.eu-central-1.amazonaws.com",
      "TelemetryIngestionRole": "harvia-eos-device-prod-telemetry-access-role-alias",
      "TelemetryIngestionStream": "harvia-eos-data-prod-sensor-data"
    },
    "GraphQL": {
      "payment": {
        "wss": "wss://2bmloen445dojlgqfnw7b4kabu.appsync-realtime-api.eu-central-1.amazonaws.com/graphql",
        "https": "https://2bmloen445dojlgqfnw7b4kabu.appsync-api.eu-central-1.amazonaws.com/graphql",
        "schemaUrl": "https://appsync.eu-central-1.amazonaws.com/v1/apis/tb3cpryf7rdsndf2mzv6yq5n3u/schema?format=SDL&includeDirectives=false"
      },
      "data": {
        "wss": "wss://b6ypjrrojzfuleunmrsysp7aya.appsync-realtime-api.eu-central-1.amazonaws.com/graphql",
        "https": "https://b6ypjrrojzfuleunmrsysp7aya.appsync-api.eu-central-1.amazonaws.com/graphql",
        "schemaUrl": "https://appsync.eu-central-1.amazonaws.com/v1/apis/rbancp257bfvxgvfxvbkvsicne/schema?format=SDL&includeDirectives=false"
      },
      "device": {
        "wss": "wss://6lhlukqhbzefnhad2qdyg2lffm.appsync-realtime-api.eu-central-1.amazonaws.com/graphql",
        "https": "https://6lhlukqhbzefnhad2qdyg2lffm.appsync-api.eu-central-1.amazonaws.com/graphql",
        "schemaUrl": "https://appsync.eu-central-1.amazonaws.com/v1/apis/25ttxxioj5dv3de5qd642yx24m/schema?format=SDL&includeDirectives=false"
      },
      "stats": {
        "wss": "wss://2y6n4pgr6nbmddojwqrsrxhfnq.appsync-realtime-api.eu-central-1.amazonaws.com/graphql",
        "https": "https://2y6n4pgr6nbmddojwqrsrxhfnq.appsync-api.eu-central-1.amazonaws.com/graphql",
        "schemaUrl": "https://appsync.eu-central-1.amazonaws.com/v1/apis/mes4eduz6fcfhbevwdsxf5zqpm/schema?format=SDL&includeDirectives=false"
      },
      "events": {
        "wss": "wss://ykn3dsmrrvc47lnzh5vowxevb4.appsync-realtime-api.eu-central-1.amazonaws.com/graphql",
        "https": "https://ykn3dsmrrvc47lnzh5vowxevb4.appsync-api.eu-central-1.amazonaws.com/graphql",
        "schemaUrl": "https://appsync.eu-central-1.amazonaws.com/v1/apis/awpp6u5r2vccll45cecflkjfo4/schema?format=SDL&includeDirectives=false"
      },
      "users": {
        "wss": "wss://qizruaso4naexbnzmmp2cokenq.appsync-realtime-api.eu-central-1.amazonaws.com/graphql",
        "https": "https://qizruaso4naexbnzmmp2cokenq.appsync-api.eu-central-1.amazonaws.com/graphql",
        "schemaUrl": "https://appsync.eu-central-1.amazonaws.com/v1/apis/szgak53ljbamvcpxcda62c62j4/schema?format=SDL&includeDirectives=false"
      }
    },
    "LoggingConfig": {
      "LoggingMode": 0
    }
  }
}
```
---

### 🌐 Getting the Endpoints Programmatically

You can fetch the endpoints programmatically using a simple HTTP GET request. The response structure matches the API Response Example shown above.

#### 🟨 JavaScript/fetch

```javascript
const response = await fetch("https://prod.api.harvia.io/endpoints");
const data = await response.json();
console.log(data);
// Response:
// {
//   "endpoints": {
//     "RestApi": {
//       "generics": { "https": "https://..." },
//       "users": { "https": "https://..." },
//       ...
//     },
//     "version": "6.41.0",
//     "Config": { ... },
//     "GraphQL": { ... },
//     ...
//   }
// }
```

#### 🐍 Python/requests

```python
import requests

response = requests.get("https://prod.api.harvia.io/endpoints")
data = response.json()
print(data)
# Response:
# {
#   "endpoints": {
#     "RestApi": {
#       "generics": { "https": "https://..." },
#       "users": { "https": "https://..." },
#       ...
#     },
#     "version": "6.41.0",
#     "Config": { ... },
#     "GraphQL": { ... },
#     ...
#   }
# }
```

#### 🔧 cURL

```bash
curl -sS "https://prod.api.harvia.io/endpoints" | jq '.'

# Response:
# {
#   "endpoints": {
#     "RestApi": {
#       "generics": { "https": "https://..." },
#       "users": { "https": "https://..." },
#       ...
#     },
#     "version": "6.41.0",
#     "Config": { ... },
#     "GraphQL": { ... },
#     ...
#   }
# }
```

---

### 🎫 JWT Token Authentication

For API access, you need to authenticate and obtain a JWT token using the public REST API. The `IdToken` must be included in the `Authorization` header of all your requests.

#### 🔑 Obtaining JWT Token

Use the REST API `/auth/token` endpoint to authenticate and obtain JWT tokens:

#### 🟨 JavaScript/fetch

```javascript
async function getApiConfiguration() {
  const response = await fetch("https://prod.api.harvia.io/endpoints");
  const { endpoints } = await response.json();
  const restApiBaseUrl = endpoints.RestApi.generics.https;
  
  return {
    restApiBaseUrl,
  };
}

async function signInAndGetIdToken(username, password) {
  try {
    const config = await getApiConfiguration();
    const response = await fetch(`${config.restApiBaseUrl}/auth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Authentication failed: ${response.status}`);
    }
    
    const tokens = await response.json();
    return {
      idToken: tokens.idToken,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
    };
  } catch (error) {
    console.error("Authentication error:", error);
    throw error;
  }
}

// Usage
const tokens = await signInAndGetIdToken("your-username", "your-password");
console.log("ID Token:", tokens.idToken);
```

#### 🐍 Python/requests

```python
import requests

def get_api_configuration():
    response = requests.get("https://prod.api.harvia.io/endpoints")
    endpoints = response.json()["endpoints"]
    rest_api_base_url = endpoints["RestApi"]["generics"]["https"]
    
    return {
        "rest_api_base_url": rest_api_base_url,
    }

def sign_in_and_get_id_token(username: str, password: str) -> dict:
    config = get_api_configuration()
    response = requests.post(
        f"{config['rest_api_base_url']}/auth/token",
        headers={"Content-Type": "application/json"},
        json={"username": username, "password": password}
    )
    
    if not response.ok:
        error = response.json()
        raise Exception(error.get("message", f"Authentication failed: {response.status_code}"))
    
    tokens = response.json()
    return {
        "id_token": tokens["idToken"],
        "access_token": tokens["accessToken"],
        "refresh_token": tokens["refreshToken"],
        "expires_in": tokens["expiresIn"],
    }

# Usage
tokens = sign_in_and_get_id_token("your-username", "your-password")
print(f"ID Token: {tokens['id_token']}")
```

#### 🔧 cURL

```bash
# First, get the REST API base URL from the endpoints API
REST_API_BASE=$(curl -sS "https://prod.api.harvia.io/endpoints" | jq -r '.endpoints.RestApi.generics.https')

# Authenticate and get tokens
curl -sS -H "Content-Type: application/json" \
  -X POST "$REST_API_BASE/auth/token" \
  --data '{"username":"your-username","password":"your-password"}'

# The response contains: { "idToken": "...", "accessToken": "...", "refreshToken": "...", "expiresIn": 3600 }
```

**Note:** Save the `idToken` from the response to use in the `Authorization: Bearer <idToken>` header for API requests.

---

### 🔄 Refreshing JWT Token

JWT tokens expire after 1 hour. For long-running applications, you'll need to refresh tokens to maintain API access. Use the REST API `/auth/refresh` endpoint to obtain new tokens.

#### 🟨 JavaScript/fetch

```javascript
async function refreshIdToken(refreshToken, email) {
  try {
    const config = await getApiConfiguration();
    const response = await fetch(`${config.restApiBaseUrl}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken, email }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Token refresh failed: ${response.status}`);
    }
    
    const tokens = await response.json();
    return {
      idToken: tokens.idToken,
      accessToken: tokens.accessToken,
      expiresIn: tokens.expiresIn,
    };
  } catch (error) {
    console.error("Token refresh error:", error);
    throw error;
  }
}

// Usage
// After initial sign-in, store the refreshToken
const initialTokens = await signInAndGetIdToken("your-username", "your-password");

// Later, when token expires (after ~1 hour)
const newTokens = await refreshIdToken(initialTokens.refreshToken, "your-username");
// Use newTokens.idToken for API requests
```

#### 🐍 Python/requests

```python
def refresh_id_token(refresh_token: str, email: str) -> dict:
    config = get_api_configuration()
    response = requests.post(
        f"{config['rest_api_base_url']}/auth/refresh",
        headers={"Content-Type": "application/json"},
        json={"refreshToken": refresh_token, "email": email}
    )
    
    if not response.ok:
        error = response.json()
        raise Exception(error.get("message", f"Token refresh failed: {response.status_code}"))
    
    tokens = response.json()
    return {
        "id_token": tokens["idToken"],
        "access_token": tokens["accessToken"],
        "expires_in": tokens["expiresIn"],
    }

# Usage
# After initial sign-in, store the refresh_token
initial_tokens = sign_in_and_get_id_token("your-username", "your-password")

# Later, when token expires (after ~1 hour)
new_tokens = refresh_id_token(initial_tokens["refresh_token"], "your-username")
# Use new_tokens["id_token"] for API requests
```

#### 🔧 cURL

```bash
# Get REST API base URL (if not already set)
REST_API_BASE=$(curl -sS "https://prod.api.harvia.io/endpoints" | jq -r '.endpoints.RestApi.generics.https')

# Refresh tokens using the refresh token from initial authentication
curl -sS -H "Content-Type: application/json" \
  -X POST "$REST_API_BASE/auth/refresh" \
  --data '{"refreshToken":"<refreshToken>","email":"your-username"}'

# The response contains: { "idToken": "...", "accessToken": "...", "expiresIn": 3600 }
```

---

### 🔒 Revoking Refresh Token

You can revoke a refresh token to invalidate it and prevent future token refreshes. Use the REST API `/auth/revoke` endpoint.

**Note:** Revoking a refresh token does not invalidate existing ID tokens; they remain valid until expiry.

#### 🟨 JavaScript/fetch

```javascript
async function revokeRefreshToken(refreshToken, email) {
  try {
    const config = await getApiConfiguration();
    const response = await fetch(`${config.restApiBaseUrl}/auth/revoke`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken, email }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Token revocation failed: ${response.status}`);
    }
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Token revocation error:", error);
    throw error;
  }
}

// Usage
// After initial sign-in, store the refreshToken
const initialTokens = await signInAndGetIdToken("your-username", "your-password");

// Later, revoke the refresh token
await revokeRefreshToken(initialTokens.refreshToken, "your-username");
// Returns: { "success": true }
```

#### 🐍 Python/requests

```python
def revoke_refresh_token(refresh_token: str, email: str) -> dict:
    config = get_api_configuration()
    response = requests.post(
        f"{config['rest_api_base_url']}/auth/revoke",
        headers={"Content-Type": "application/json"},
        json={"refreshToken": refresh_token, "email": email}
    )
    
    if not response.ok:
        error = response.json()
        raise Exception(error.get("message", f"Token revocation failed: {response.status_code}"))
    
    return response.json()

# Usage
# After initial sign-in, store the refresh_token
initial_tokens = sign_in_and_get_id_token("your-username", "your-password")

# Later, revoke the refresh token
result = revoke_refresh_token(initial_tokens["refresh_token"], "your-username")
# Returns: { "success": True }
```

#### 🔧 cURL

```bash
# Get REST API base URL (if not already set)
REST_API_BASE=$(curl -sS "https://prod.api.harvia.io/endpoints" | jq -r '.endpoints.RestApi.generics.https')

# Revoke refresh token
curl -sS -H "Content-Type: application/json" \
  -X POST "$REST_API_BASE/auth/revoke" \
  --data '{"refreshToken":"<refreshToken>","email":"your-username"}'

# The response contains: { "success": true }
```

---

## 🔤 Scalar Types

Common GraphQL scalar types used across all services:

| Type | Description | Example |
|------|-------------|---------|
| `String` | Standard string type | `"device-123"` |
| `Int` | Integer number | `42` |
| `Float` | Floating-point number | `3.14` |
| `ID` | Unique identifier | `"abc123"` |
| `AWSDateTime` | AWS datetime scalar (ISO 8601 format) | `"2025-01-01T00:00:00.000Z"` |
| `AWSJSON` | AWS JSON scalar (JSON as string) | `"{\"temp\": 80}"` |

## 📦 Complete Example
End-to-end: fetch configuration, authenticate via REST API to obtain an IdToken, then call a service.

#### 🟨 JavaScript/fetch

```javascript
async function getApiConfiguration() {
  const response = await fetch("https://prod.api.harvia.io/endpoints");
  const { endpoints } = await response.json();
  const restApiBaseUrl = endpoints.RestApi.generics.https;
  
  return {
    restApiBaseUrl,
    graphql: endpoints.GraphQL,
  };
}

async function signInAndGetIdToken(username, password) {
  try {
    const config = await getApiConfiguration();
    const response = await fetch(`${config.restApiBaseUrl}/auth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Authentication failed: ${response.status}`);
    }
    
    const tokens = await response.json();
    return {
      idToken: tokens.idToken,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
    };
  } catch (error) {
    console.error("Authentication error:", error);
    throw error;
  }
}

// Perform a GraphQL POST to a service endpoint
async function makeGraphQLRequest() {
  const config = await getApiConfiguration();
  const tokens = await signInAndGetIdToken("your-username", "your-password");
  console.log("ID Token:", tokens.idToken);
  
  await fetch(config.graphql.data.https, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${tokens.idToken}`
    },
    body: JSON.stringify({ query: "<your GraphQL query>", variables: { /* ... */ } })
  });
  // See individual service docs (data/device/events) for concrete queries.
}

makeGraphQLRequest();
```

#### 🐍 Python/requests

```python
import requests

def get_api_configuration():
    response = requests.get("https://prod.api.harvia.io/endpoints")
    endpoints = response.json()["endpoints"]
    rest_api_base_url = endpoints["RestApi"]["generics"]["https"]
    
    return {
        "rest_api_base_url": rest_api_base_url,
        "graphql": endpoints["GraphQL"],
    }

def sign_in_and_get_id_token(username: str, password: str) -> dict:
    config = get_api_configuration()
    response = requests.post(
        f"{config['rest_api_base_url']}/auth/token",
        headers={"Content-Type": "application/json"},
        json={"username": username, "password": password}
    )
    
    if not response.ok:
        error = response.json()
        raise Exception(error.get("message", f"Authentication failed: {response.status_code}"))
    
    tokens = response.json()
    return {
        "id_token": tokens["idToken"],
        "access_token": tokens["accessToken"],
        "refresh_token": tokens["refreshToken"],
        "expires_in": tokens["expiresIn"],
    }

# Perform a GraphQL POST to a service endpoint
config = get_api_configuration()
tokens = sign_in_and_get_id_token("your-username", "your-password")
print(f"ID Token: {tokens['id_token']}")

requests.post(
    config["graphql"]["data"]["https"],
    headers={
        "Content-Type": "application/json",
        "Authorization": f"Bearer {tokens['id_token']}",
    },
    json={"query": "<your GraphQL query>", "variables": {}}
)
# See individual service docs (data/device/events) for concrete queries.
```

#### 🔧 cURL

```bash
# 1. Get REST API base URL and GraphQL endpoint
ENDPOINTS=$(curl -sS "https://prod.api.harvia.io/endpoints")
REST_API_BASE=$(echo "$ENDPOINTS" | jq -r '.endpoints.RestApi.generics.https')
GRAPHQL_DATA=$(echo "$ENDPOINTS" | jq -r '.endpoints.GraphQL.data.https')

# 2. Authenticate and get tokens
TOKEN_RESPONSE=$(curl -sS -H "Content-Type: application/json" \
  -X POST "$REST_API_BASE/auth/token" \
  --data '{"username":"your-username","password":"your-password"}')

ID_TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r '.idToken')
echo "ID Token: $ID_TOKEN"

# 3. Make a GraphQL request
curl -sS -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ID_TOKEN" \
  -X POST "$GRAPHQL_DATA" \
  --data '{"query":"<your GraphQL query>","variables":{}}'

# See individual service docs (data/device/events) for concrete queries.
```

---

🌍 **Configuration Reference:** [Harvia Endpoints API](https://prod.api.harvia.io/endpoints)

📝 **Note: Always fetch the latest configuration to ensure you're using the current REST API and GraphQL endpoints. The configuration may change over time.**

---
