#include <WiFi.h>
#include <WebServer.h>
#include <Adafruit_NeoPixel.h>
#include <Preferences.h>
#include <DNSServer.h>
#include <LittleFS.h>
#include <SPI.h>
#include <MFRC522.h>
#include <ESP32Servo.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <time.h>
#include <PubSubClient.h>
#include <WiFiClientSecure.h>

// ===== CONFIGURATION =====
const char* SUPABASE_URL = "https://zqvaugrrckqhyykaicyf.supabase.co";
const char* SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxdmF1Z3JyY2txaHl5a2FpY3lmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzODcxOTcsImV4cCI6MjA3NTk2MzE5N30.K0x1dh9BqnYFEdaUlzIYy7JCWgrglPFypaARlwf59Ac";

// Device ID - unique for this ESP32
const char* DEVICE_ID = "lock_001";

// HiveMQ Cloud Configuration (from your engineer)
const char* MQTT_BROKER = "2e384087a7df4e1db0b835410b46bb15.s1.eu.hivemq.cloud";
const int MQTT_PORT = 8883;  // TLS/SSL port
const char* MQTT_USER = "bridge";
const char* MQTT_PASS = "BEwnGrnE11k71WYHLfBv8yq4H";

// MQTT Topics - using engineer's prefix "keyaccess"
const char* TOPIC_COMMAND = "keyaccess/commands/lock_001";      // Listen for unlock commands
const char* TOPIC_STATUS = "keyaccess/status/lock_001";         // Publish lock status
const char* TOPIC_ACCESS_LOG = "keyaccess/access/lock_001";     // Publish access attempts

// Timezone
const long gmtOffset_sec = -18000;  // EST = UTC-5 hours
const int daylightOffset_sec = 0;

// ===== PINS =====
#define NEOPIXEL_PIN 2
#define RST_PIN 22
#define SS_PIN 21
#define SERVO_PIN 13

// ===== OBJECTS =====
Adafruit_NeoPixel statusLed(1, NEOPIXEL_PIN, NEO_GRB + NEO_KHZ800);
WebServer server(80);
DNSServer dnsServer;
Preferences preferences;
MFRC522 mfrc522(SS_PIN, RST_PIN);
Servo doorServo;
WiFiClientSecure espClient;
PubSubClient mqttClient(espClient);

// ===== VARIABLES =====
String stored_ssid = "";
String stored_password = "";
bool configMode = false;
const byte DNS_PORT = 53;

// Servo
const int LOCKED_POSITION = 45;
const int UNLOCKED_POSITION = 0;

// Timing
unsigned long unlockTime = 0;
bool isUnlocked = false;
const unsigned long UNLOCK_DURATION = 10000;
unsigned long lastMqttReconnect = 0;
unsigned long lastHeartbeat = 0;
const unsigned long HEARTBEAT_INTERVAL = 60000; // 60 seconds

// ===== FUNCTION DECLARATIONS =====
void setLedColor(uint32_t color);
void startConfigMode();
void setupNormalMode();
String loadFile(String path);
void handleScanNetworks();
void handleSaveConfig();
void handleResetWiFi();
String getNFCUID();
void verifyBookingAccess(String nfcUID);
void logAccess(String nfcUID, String userName, String result, String bookingId, String propertyId, String nfcKeyId);
void unlockDoor(String method, String user);
void lockDoor();
String getCurrentTimestamp();
void printCurrentTime();
void setupMQTT();
void reconnectMQTT();
void mqttCallback(char* topic, byte* payload, unsigned int length);
void publishStatus();
void publishAccessLog(String nfcUID, String userName, String result, String bookingId);

// ===== SETUP =====

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n╔═══════════════════════════════════════╗");
  Serial.println("║   🔐 KEYACCESS SMART LOCK            ║");
  Serial.println("║      ESP32 NFC + MQTT                 ║");
  Serial.println("╚═══════════════════════════════════════╝\n");
  
  // Initialize NeoPixel
  statusLed.begin();
  setLedColor(statusLed. Color(255, 165, 0));
  
  // Initialize File System
  if (!LittleFS.begin(true)) {
    Serial.println("❌ LittleFS failed");
    setLedColor(statusLed. Color(255, 0, 0));
    return;
  }
  Serial.println("✅ LittleFS mounted");
  
  // Initialize RFID
  SPI.begin();
  mfrc522.PCD_Init();
  delay(100);
  Serial.println("✅ RFID initialized");
  mfrc522.PCD_DumpVersionToSerial();
  
  // Initialize Servo
  doorServo.attach(SERVO_PIN);
  doorServo.write(LOCKED_POSITION);
  Serial.print("✅ Servo ready (");
  Serial.print(LOCKED_POSITION);
  Serial.println("° LOCKED)");
  
  // Load WiFi credentials
  preferences.begin("wifi-config", false);
  stored_ssid = preferences.getString("ssid", "");
  stored_password = preferences.getString("password", "");
  preferences.end();
  
  // Connect WiFi
  if (stored_ssid.length() > 0) {
    Serial.println("\n📡 Connecting to WiFi.. .");
    Serial.print("   SSID: ");
    Serial.println(stored_ssid);
    
    WiFi.mode(WIFI_STA);
    WiFi.begin(stored_ssid.c_str(), stored_password.c_str());
    
    int timeout = 0;
    while (WiFi. status() != WL_CONNECTED && timeout < 10) {
      setLedColor(statusLed. Color(255, 165, 0));
      delay(250);
      setLedColor(statusLed.Color(0, 0, 0));
      delay(250);
      Serial.print(".");
      timeout++;
    }
    
    if (WiFi.status() == WL_CONNECTED) {
      Serial.println("\n✅ WiFi connected");
      Serial.print("   IP: ");
      Serial.println(WiFi.localIP());
      Serial.print("   Signal: ");
      Serial.print(WiFi.RSSI());
      Serial.println(" dBm");
      
      setLedColor(statusLed. Color(0, 255, 0));
      
      // Sync time
      Serial.println("\n🕐 Syncing time.. .");
      configTime(gmtOffset_sec, daylightOffset_sec, "pool.ntp.org");
      
      struct tm timeinfo;
      int attempts = 0;
      while (! getLocalTime(&timeinfo) && attempts < 10) {
        Serial.print(".");
        delay(500);
        attempts++;
      }
      
      if (getLocalTime(&timeinfo)) {
        Serial.println("\n✅ Time synced");
        printCurrentTime();
      }
      
      // Setup MQTT
      setupMQTT();
      
      setupNormalMode();
      
      Serial.println("\n╔═══════════════════════════════════════╗");
      Serial.println("║        🔒 SYSTEM READY                ║");
      Serial.println("║   • NFC:   Ready for card scan          ║");
      Serial.println("║   • MQTT: HiveMQ Cloud (TLS)          ║");
      Serial.println("║   • Date: 2025-12-14                  ║");
      Serial.println("╚═══════════════════════════════════════╝");
      
      Serial.println("\n📡 MQTT Topics:");
      Serial.print("   📥 Listen:  ");
      Serial.println(TOPIC_COMMAND);
      Serial.print("   📤 Status: ");
      Serial.println(TOPIC_STATUS);
      Serial.print("   📤 Logs:    ");
      Serial.println(TOPIC_ACCESS_LOG);
      Serial.println();
      
      return;
    } else {
      Serial.println("\n❌ WiFi failed");
      WiFi.disconnect();
    }
  } else {
    Serial.println("ℹ️  No WiFi configured");
  }
  
  startConfigMode();
}

// ===== MAIN LOOP =====

void loop() {
  if (configMode) {
    dnsServer.processNextRequest();
    server.handleClient();
  } else {
    server.handleClient();
    
    // MQTT connection management
    if (! mqttClient.connected()) {
      if (millis() - lastMqttReconnect > 5000) {
        reconnectMQTT();
        lastMqttReconnect = millis();
      }
    } else {
      mqttClient. loop();
    }
    
    // Heartbeat
    if (mqttClient.connected() && (millis() - lastHeartbeat > HEARTBEAT_INTERVAL)) {
      publishStatus();
      lastHeartbeat = millis();
    }
    
    // Auto-lock
    if (isUnlocked && (millis() - unlockTime >= UNLOCK_DURATION)) {
      lockDoor();
    }
    
    // NFC scanning
    if (! mfrc522.PICC_IsNewCardPresent()) {
      delay(50);
      return;
    }
    
    if (! mfrc522.PICC_ReadCardSerial()) {
      delay(50);
      return;
    }
    
    String nfcUID = getNFCUID();
    
    Serial.println("\n═══════════════════════════════════════");
    Serial.println("📱 NFC CARD DETECTED");
    Serial.println("═══════════════════════════════════════");
    Serial.print("   UID: ");
    Serial.println(nfcUID);
    Serial.print("   ");
    printCurrentTime();
    Serial.println("───────────────────────────────────────");
    
    verifyBookingAccess(nfcUID);
    
    Serial.println("═══════════════════════════════════════\n");
    
    mfrc522.PICC_HaltA();
    mfrc522.PCD_StopCrypto1();
    
    delay(2000);
    
    // LED status
    if (WiFi.status() != WL_CONNECTED) {
      setLedColor(statusLed.Color(255, 0, 0)); // Red = no WiFi
    } else if (! isUnlocked) {
      setLedColor(statusLed.Color(0, 255, 0)); // Green = ready
    }
  }
}

// ===== MQTT FUNCTIONS =====

void setupMQTT() {
  // Configure TLS - skip certificate verification for simplicity
  espClient.setInsecure();
  
  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);
  mqttClient.setKeepAlive(60);
  mqttClient.setSocketTimeout(15);
  mqttClient.setBufferSize(1024);
  
  Serial.println("\n📡 Configuring MQTT...");
  Serial.print("   Broker: ");
  Serial.println(MQTT_BROKER);
  Serial.print("   Port: ");
  Serial.print(MQTT_PORT);
  Serial.println(" (TLS)");
  Serial.print("   User: ");
  Serial.println(MQTT_USER);
  Serial.print("   Device:  ");
  Serial.println(DEVICE_ID);
  
  reconnectMQTT();
}

void reconnectMQTT() {
  if (WiFi.status() != WL_CONNECTED) return;
  
  Serial.print("📡 Connecting MQTT...  ");
  
  // Use device ID as client ID
  String clientId = String(DEVICE_ID);
  
  if (mqttClient.connect(clientId.c_str(), MQTT_USER, MQTT_PASS)) {
    Serial.println("✅ Connected!");
    
    // Subscribe to command topic
    if (mqttClient.subscribe(TOPIC_COMMAND)) {
      Serial.print("   📥 Subscribed:  ");
      Serial.println(TOPIC_COMMAND);
    } else {
      Serial.println("   ❌ Subscribe failed");
    }
    
    // Publish initial status
    publishStatus();
    
  } else {
    Serial.print("❌ Failed, rc=");
    int state = mqttClient.state();
    Serial.println(state);
    
    switch(state) {
      case -4: Serial.println("   → Timeout"); break;
      case -3: Serial.println("   → Connection lost"); break;
      case -2: Serial.println("   → Connect failed"); break;
      case -1: Serial.println("   → Disconnected"); break;
      case 1: Serial.println("   → Bad protocol"); break;
      case 2: Serial.println("   → Bad client ID"); break;
      case 3: Serial.println("   → Unavailable"); break;
      case 4: Serial.println("   → Bad credentials"); break;
      case 5: Serial.println("   → Unauthorized"); break;
    }
  }
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String message = "";
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  
  Serial.println("\n📨 MQTT MESSAGE RECEIVED");
  Serial.print("   Topic: ");
  Serial.println(topic);
  Serial.print("   Payload: ");
  Serial.println(message);
  
  // Parse JSON
  DynamicJsonDocument doc(512);
  DeserializationError error = deserializeJson(doc, message);
  
  if (error) {
    Serial.print("   ❌ JSON parse error: ");
    Serial.println(error.c_str());
    return;
  }
  
  String command = doc["command"]. as<String>();
  
  if (command == "unlock") {
    String user = doc["user"] | "Remote User";
    String bookingId = doc["booking_id"] | "";
    
    Serial.print("   🔓 Unlock requested by: ");
    Serial.println(user);
    
    unlockDoor("MQTT", user);
    
    // Log to Supabase if booking ID provided
    if (bookingId.length() > 0) {
      logAccess("MQTT_REMOTE", user, "mqtt_unlock", bookingId, "", "");
    }
    
    // Publish access log to MQTT
    publishAccessLog("MQTT_REMOTE", user, "unlocked", bookingId);
    
  } else if (command == "lock") {
    Serial.println("   🔒 Lock command received");
    lockDoor();
    
  } else if (command == "status") {
    Serial.println("   📊 Status request");
    publishStatus();
    
  } else {
    Serial.print("   ⚠️ Unknown command: ");
    Serial.println(command);
  }
}

void publishStatus() {
  if (!mqttClient.connected()) return;
  
  DynamicJsonDocument doc(512);
  doc["device_id"] = DEVICE_ID;
  doc["status"] = isUnlocked ? "unlocked" : "locked";
  doc["locked"] = ! isUnlocked;
  doc["timestamp"] = getCurrentTimestamp();
  doc["uptime_seconds"] = millis() / 1000;
  doc["wifi_rssi"] = WiFi.RSSI();
  doc["free_heap"] = ESP.getFreeHeap();
  doc["mqtt_connected"] = true;
  
  String output;
  serializeJson(doc, output);
  
  if (mqttClient.publish(TOPIC_STATUS, output.c_str(), true)) {
    Serial.print("📤 Status published: ");
    Serial.println(isUnlocked ? "unlocked" : "locked");
  }
}

void publishAccessLog(String nfcUID, String userName, String result, String bookingId) {
  if (!mqttClient.connected()) return;
  
  DynamicJsonDocument doc(512);
  doc["device_id"] = DEVICE_ID;
  doc["nfc_uid"] = nfcUID;
  doc["user_name"] = userName;
  doc["result"] = result;
  doc["timestamp"] = getCurrentTimestamp();
  
  if (bookingId.length() > 0) {
    doc["booking_id"] = bookingId;
  }
  
  String output;
  serializeJson(doc, output);
  
  if (mqttClient.publish(TOPIC_ACCESS_LOG, output.c_str())) {
    Serial.println("📤 Access log published");
  }
}

// ===== LED =====

void setLedColor(uint32_t color) {
  statusLed.setPixelColor(0, color);
  statusLed.show();
}

// ===== CONFIG MODE =====

void startConfigMode() {
  configMode = true;
  setLedColor(statusLed.Color(0, 0, 255));
  
  WiFi.mode(WIFI_AP);
  WiFi.softAP("AirLockSetup", "12345678");
  
  dnsServer.start(DNS_PORT, "*", WiFi. softAPIP());
  
  Serial.println("\n========================================");
  Serial.println("   CONFIGURATION MODE");
  Serial.println("========================================");
  Serial.println("1. Connect WiFi:  AirLockSetup");
  Serial.println("2. Password: 12345678");
  Serial.println("3. Open:  http://192.168.4.1");
  Serial.println("========================================\n");
  
  server.serveStatic("/", LittleFS, "/config.html");
  server.serveStatic("/style.css", LittleFS, "/style.css");
  server.serveStatic("/script. js", LittleFS, "/script.js");
  
  server.on("/save", HTTP_POST, handleSaveConfig);
  server.on("/scan", handleScanNetworks);
  
  server.onNotFound([]() {
    server.send(200, "text/html", loadFile("/config.html"));
  });
  
  server.begin();
}

void setupNormalMode() {
  configMode = false;
  server.on("/reset", handleResetWiFi);
  server.begin();
}

String loadFile(String path) {
  File file = LittleFS.open(path, "r");
  if (!file) return "Error loading file";
  String content = file.readString();
  file.close();
  return content;
}

// ===== HANDLERS =====

void handleScanNetworks() {
  int n = WiFi.scanNetworks();
  String json = "{\"networks\":[";
  for (int i = 0; i < n; i++) {
    if (i > 0) json += ",";
    json += "\"" + WiFi.SSID(i) + "\"";
  }
  json += "]}";
  server.send(200, "application/json", json);
}

void handleSaveConfig() {
  stored_ssid = server.arg("ssid");
  stored_password = server.arg("password");
  
  preferences.begin("wifi-config", false);
  preferences.putString("ssid", stored_ssid);
  preferences.putString("password", stored_password);
  preferences.end();
  
  server.send(200, "application/json", "{\"status\":\"success\"}");
  delay(2000);
  ESP.restart();
}

void handleResetWiFi() {
  if (mqttClient.connected()) {
    DynamicJsonDocument doc(128);
    doc["status"] = "offline";
    doc["reason"] = "reset";
    String output;
    serializeJson(doc, output);
    mqttClient.publish(TOPIC_STATUS, output.c_str());
  }
  
  preferences.begin("wifi-config", false);
  preferences.clear();
  preferences.end();
  
  server.send(200, "application/json", "{\"status\": \"reset\"}");
  delay(2000);
  ESP.restart();
}

// ===== NFC =====

String getNFCUID() {
  String uid = "";
  for (byte i = 0; i < mfrc522.uid.size; i++) {
    if (mfrc522.uid. uidByte[i] < 0x10) uid += "0";
    uid += String(mfrc522.uid.uidByte[i], HEX);
  }
  uid.toUpperCase();
  return uid;
}

// ===== TIME =====

void printCurrentTime() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    Serial.println("⚠️ Time unavailable");
    return;
  }
  
  char buffer[50];
  strftime(buffer, sizeof(buffer), "🕐 %Y-%m-%d %H:%M:%S", &timeinfo);
  Serial.println(buffer);
}

String getCurrentTimestamp() {
  struct tm timeinfo;
  if (! getLocalTime(&timeinfo)) {
    return "2025-12-14T00:00:00-05:00";
  }
  
  char buffer[30];
  strftime(buffer, sizeof(buffer), "%Y-%m-%dT%H:%M:%S", &timeinfo);
  
  char tzBuffer[10];
  strftime(tzBuffer, sizeof(tzBuffer), "%z", &timeinfo);
  
  return String(buffer) + String(tzBuffer);
}

// ===== SUPABASE INTEGRATION =====

void verifyBookingAccess(String nfcUID) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("   ❌ NO WIFI - Cannot verify");
    setLedColor(statusLed. Color(255, 0, 0));
    delay(2000);
    setLedColor(statusLed. Color(0, 255, 0));
    return;
  }
  
  Serial.println("   🔍 Verifying with Supabase...");
  setLedColor(statusLed. Color(255, 165, 0));
  
  HTTPClient http;
  String url = String(SUPABASE_URL) + "/rest/v1/rpc/verify_nfc_booking_access";
  
  http.begin(url);
  http.addHeader("apikey", SUPABASE_KEY);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_KEY);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(5000);
  
  DynamicJsonDocument requestDoc(256);
  requestDoc["nfc_uid_param"] = nfcUID;
  requestDoc["check_time"] = getCurrentTimestamp();
  
  String requestBody;
  serializeJson(requestDoc, requestBody);
  
  int httpCode = http.POST(requestBody);
  
  if (httpCode == 200) {
    String payload = http.getString();
    
    DynamicJsonDocument doc(2048);
    DeserializationError error = deserializeJson(doc, payload);
    
    if (error) {
      Serial.print("   ❌ JSON error: ");
      Serial.println(error.c_str());
      http.end();
      return;
    }
    
    bool success = doc["success"];
    
    if (success) {
      String userName = doc["user_name"]. as<String>();
      String propertyName = doc["property_name"].as<String>();
      String bookingId = doc["booking_id"]. as<String>();
      
      Serial.println("   ╔═══════════════════════════════════╗");
      Serial.println("   ║     ✅ ACCESS GRANTED             ║");
      Serial.println("   ╚═══════════════════════════════════╝");
      Serial.print("   👤 Guest: ");
      Serial.println(userName);
      Serial.print("   🏠 Property: ");
      Serial.println(propertyName);
      
      unlockDoor("NFC", userName);
      
      logAccess(nfcUID, userName, "success", 
               bookingId,
               doc["property_id"].as<String>(),
               doc["nfc_key_id"].as<String>());
      
      publishAccessLog(nfcUID, userName, "granted", bookingId);
      
    } else {
      String message = doc["message"].as<String>();
      String reason = doc["reason"].as<String>();
      
      Serial. println("   ╔═══════════════════════════════════╗");
      Serial.println("   ║     ❌ ACCESS DENIED              ║");
      Serial.println("   ╚═══════════════════════════════════╝");
      Serial.print("   Reason: ");
      Serial.println(message);
      
      setLedColor(statusLed.Color(255, 0, 0));
      delay(2000);
      setLedColor(statusLed.Color(0, 255, 0));
      
      logAccess(nfcUID, "Unknown", reason, "", "", "");
      publishAccessLog(nfcUID, "Unknown", reason, "");
    }
    
  } else {
    Serial.print("   ❌ HTTP error: ");
    Serial.println(httpCode);
  }
  
  http.end();
}

void logAccess(String nfcUID, String userName, String result, 
               String bookingId, String propertyId, String nfcKeyId) {
  if (WiFi.status() != WL_CONNECTED) return;
  
  HTTPClient http;
  String url = String(SUPABASE_URL) + "/rest/v1/nfc_access_logs";
  
  http.begin(url);
  http.addHeader("apikey", SUPABASE_KEY);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_KEY);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Prefer", "return=minimal");
  
  DynamicJsonDocument doc(512);
  doc["nfc_uid"] = nfcUID;
  doc["user_name"] = userName;
  doc["result"] = result;
  doc["device_id"] = DEVICE_ID;
  
  if (bookingId.length() > 0) doc["booking_id"] = bookingId;
  if (propertyId.length() > 0) doc["property_id"] = propertyId;
  if (nfcKeyId.length() > 0) doc["nfc_key_id"] = nfcKeyId;
  
  String jsonData;
  serializeJson(doc, jsonData);
  
  http.POST(jsonData);
  http.end();
}

// ===== LOCK CONTROL =====

void unlockDoor(String method, String user) {
  Serial.println("   ╔═══════════════════════════════════╗");
  Serial.print("   ║  🔓 UNLOCKING (");
  Serial.print(method);
  Serial.println(")");
  Serial.print("   ║  By: ");
  Serial.println(user);
  Serial.println("   ╚═══════════════════════════════════╝");
  
  setLedColor(statusLed. Color(0, 255, 0));
  doorServo.write(UNLOCKED_POSITION);
  isUnlocked = true;
  unlockTime = millis();
  
  publishStatus();
  
  Serial.println("   ✓ Unlocked for 10 seconds");
}

void lockDoor() {
  Serial.println("   ╔═══════════════════════════════════╗");
  Serial.println("   ║       🔒 LOCKING DOOR             ║");
  Serial.println("   ╚═══════════════════════════════════╝");
  
  doorServo.write(LOCKED_POSITION);
  isUnlocked = false;
  
  setLedColor(statusLed. Color(0, 255, 0));
  publishStatus();
  
  Serial.println("   ✓ Locked\n");
}