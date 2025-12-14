/**
 * ESP32 Client - Handles communication with ESP32 AirLock devices
 */

// Get ESP32 IP from environment variable or use default
// You can set EXPO_PUBLIC_ESP32_IP in your .env file
// Or pass it dynamically from property data
const DEFAULT_ESP32_IP = process.env.EXPO_PUBLIC_ESP32_IP || '192.168.1.100';
const ESP32_PORT = 80; // Default HTTP port

export interface ESP32Config {
  ip: string;
  port?: number;
}

/**
 * Get ESP32 base URL
 */
export function getESP32BaseUrl(config?: ESP32Config): string {
  const ip = config?.ip || DEFAULT_ESP32_IP;
  const port = config?.port || ESP32_PORT;
  return `http://${ip}:${port}`;
}

/**
 * Send unlock command to ESP32
 */
export async function unlockESP32(config?: ESP32Config): Promise<{ success: boolean; message?: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

  try {
    const baseUrl = getESP32BaseUrl(config);
    const url = `${baseUrl}/open`;
    
    console.log(`🔓 Attempting to unlock ESP32 at ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`ESP32 responded with status ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ ESP32 unlock successful:', data);
    
    return { success: true, message: data.message || 'Lock opened successfully' };
  } catch (error: any) {
    clearTimeout(timeoutId);
    console.error('❌ ESP32 unlock failed:', error);
    
    let errorMessage = 'Failed to communicate with lock device';
    if (error.name === 'AbortError') {
      errorMessage = 'Request timed out. Please check ESP32 connection.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return { 
      success: false, 
      message: errorMessage
    };
  }
}

/**
 * Get ESP32 status
 */
export async function getESP32Status(config?: ESP32Config): Promise<any> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

  try {
    const baseUrl = getESP32BaseUrl(config);
    const url = `${baseUrl}/status`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`ESP32 responded with status ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    clearTimeout(timeoutId);
    console.error('❌ Failed to get ESP32 status:', error);
    throw error;
  }
}

