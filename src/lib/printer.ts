"use client";

// @ts-ignore
import ReceiptPrinterEncoder from '@point-of-sale/receipt-printer-encoder';

// ─── Common ESC/POS Bluetooth GATT Service & Characteristic UUIDs ─────────────
// These cover most 80mm thermal printers (Xprinter, EPSON, Rongta, etc.)
const PRINTER_SERVICE_UUIDS = [
  '000018f0-0000-1000-8000-00805f9b34fb', // Common thermal printer service
  '0000ff00-0000-1000-8000-00805f9b34fb', // Xprinter / generic
  '0000ffe0-0000-1000-8000-00805f9b34fb', // HM-10 style BLE serial
  '6e400001-b5a3-f393-e0a9-e50e24dcca9e', // Nordic UART (nRF)
  '00001101-0000-1000-8000-00805f9b34fb', // SPP emulation
];

const PRINTER_CHAR_UUIDS = [
  '000018f1-0000-1000-8000-00805f9b34fb', // Common write char
  '0000ff02-0000-1000-8000-00805f9b34fb', // Xprinter write
  '0000ffe1-0000-1000-8000-00805f9b34fb', // HM-10 write
  '6e400002-b5a3-f393-e0a9-e50e24dcca9e', // Nordic UART TX
];

// Module-level state for Web Bluetooth session
let webBluetoothDevice: BluetoothDevice | null = null;
let webBluetoothChar: BluetoothRemoteGATTCharacteristic | null = null;

// ─── Type Exports ─────────────────────────────────────────────────────────────
export interface BluetoothPrinterDevice {
  id: string;
  class: number;
  address: string;
  name: string;
}

// ─── Environment Detection ────────────────────────────────────────────────────

/** Returns true if running inside the native Android APK (Capacitor + cordova plugin). */
export const isCapacitorBluetooth = (): boolean =>
  typeof window !== 'undefined' && !!(window as any).bluetoothSerial;

/** Returns true if Web Bluetooth API is available (Chrome on Android/Desktop). */
export const isWebBluetoothAvailable = (): boolean =>
  typeof window !== 'undefined' &&
  typeof (navigator as any).bluetooth !== 'undefined';

/** Returns true if ANY printing method is available. */
export const isBluetoothAvailable = (): boolean =>
  isCapacitorBluetooth() || isWebBluetoothAvailable();

// ─── Capacitor Plugin Wrappers ────────────────────────────────────────────────

export const enableBluetooth = (): Promise<void> =>
  new Promise((resolve, reject) => {
    if (!isCapacitorBluetooth()) return reject(new Error('Bluetooth plugin not available'));
    (window as any).bluetoothSerial.enable(resolve, reject);
  });

export const listDevices = (): Promise<BluetoothPrinterDevice[]> =>
  new Promise((resolve, reject) => {
    if (!isCapacitorBluetooth()) return reject(new Error('Bluetooth plugin not available'));
    (window as any).bluetoothSerial.list(resolve, reject);
  });

export const isPrinterConnected = (): Promise<boolean> =>
  new Promise((resolve) => {
    // Web Bluetooth: check module-level state
    if (isWebBluetoothAvailable() && !isCapacitorBluetooth()) {
      resolve(
        webBluetoothDevice !== null &&
        webBluetoothDevice.gatt?.connected === true &&
        webBluetoothChar !== null
      );
      return;
    }
    if (!isCapacitorBluetooth()) return resolve(false);
    (window as any).bluetoothSerial.isConnected(
      () => resolve(true),
      () => resolve(false)
    );
  });

// ─── Web Bluetooth Connect ────────────────────────────────────────────────────

/**
 * Opens the browser's native Bluetooth pairing popup.
 * The user selects their printer. We then find the writable GATT characteristic.
 * Returns the connected device name.
 */
export const connectWebBluetooth = async (): Promise<{ name: string; id: string }> => {
  if (!isWebBluetoothAvailable()) {
    throw new Error('Web Bluetooth is not supported in this browser. Use Google Chrome or Samsung Internet.');
  }

  // Disconnect any previous connection
  if (webBluetoothDevice && webBluetoothDevice.gatt?.connected) {
    webBluetoothDevice.gatt.disconnect();
  }
  webBluetoothChar = null;
  webBluetoothDevice = null;

  const device = await (navigator as any).bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: PRINTER_SERVICE_UUIDS,
  });

  const server = await device.gatt.connect();
  webBluetoothDevice = device;

  // Try each known service UUID until we find a writable characteristic
  let foundChar: BluetoothRemoteGATTCharacteristic | null = null;

  for (const serviceUuid of PRINTER_SERVICE_UUIDS) {
    try {
      const service = await server.getPrimaryService(serviceUuid);
      // Try each known write characteristic UUID
      for (const charUuid of PRINTER_CHAR_UUIDS) {
        try {
          const char = await service.getCharacteristic(charUuid);
          const props = char.properties;
          if (props.write || props.writeWithoutResponse) {
            foundChar = char;
            break;
          }
        } catch { /* not found, try next */ }
      }
      // Fallback: enumerate all characteristics and pick first writable one
      if (!foundChar) {
        const chars = await service.getCharacteristics();
        for (const c of chars) {
          if (c.properties.write || c.properties.writeWithoutResponse) {
            foundChar = c;
            break;
          }
        }
      }
      if (foundChar) break;
    } catch { /* service not found, try next */ }
  }

  if (!foundChar) {
    device.gatt?.disconnect();
    webBluetoothDevice = null;
    throw new Error('Could not find a writable characteristic on this printer. Make sure the printer is in pairing mode.');
  }

  webBluetoothChar = foundChar;

  // Handle unexpected disconnections using the local device reference (avoids null check on module var)
  device.addEventListener('gattserverdisconnected', () => {
    webBluetoothChar = null;
  });

  return { name: device.name || 'Unknown Printer', id: device.id };
};

export const disconnectWebBluetooth = (): void => {
  if (webBluetoothDevice?.gatt?.connected) {
    webBluetoothDevice.gatt.disconnect();
  }
  webBluetoothChar = null;
};

export const getWebBluetoothDeviceName = (): string | null =>
  webBluetoothDevice?.name || null;

// ─── Unified Connect / Disconnect ─────────────────────────────────────────────

/** Connect to a printer — uses Capacitor plugin if in APK, Web Bluetooth in browser. */
export const connectPrinter = async (macOrId?: string): Promise<void> => {
  if (isCapacitorBluetooth()) {
    if (!macOrId) throw new Error('MAC address required for Android Bluetooth connection.');
    return new Promise((resolve, reject) => {
      (window as any).bluetoothSerial.connect(macOrId, resolve, reject);
    });
  }
  // Web Bluetooth — opens browser popup
  await connectWebBluetooth();
};

/** Disconnect from the currently connected printer. */
export const disconnectPrinter = async (): Promise<void> => {
  if (isCapacitorBluetooth()) {
    return new Promise((resolve, reject) => {
      (window as any).bluetoothSerial.disconnect(resolve, reject);
    });
  }
  disconnectWebBluetooth();
};

// ─── Write Data ───────────────────────────────────────────────────────────────

const CHUNK_SIZE = 512; // Avoid MTU overflow on BLE

/** Write raw bytes to the connected printer. */
export const writeToPrinter = async (data: Uint8Array): Promise<void> => {
  if (isCapacitorBluetooth()) {
    return new Promise((resolve, reject) => {
      (window as any).bluetoothSerial.write(data, resolve, reject);
    });
  }

  // Web Bluetooth path — write in chunks
  if (!webBluetoothChar) throw new Error('Printer not connected via Web Bluetooth.');

  const useWriteWithoutResponse = webBluetoothChar.properties.writeWithoutResponse;

  for (let offset = 0; offset < data.length; offset += CHUNK_SIZE) {
    const chunk = data.slice(offset, offset + CHUNK_SIZE);
    if (useWriteWithoutResponse) {
      await webBluetoothChar.writeValueWithoutResponse(chunk);
    } else {
      await webBluetoothChar.writeValueWithResponse(chunk);
    }
    // Small delay to prevent buffer overflow on slow printers
    await new Promise(r => setTimeout(r, 20));
  }
};

// ─── Receipt Generation ────────────────────────────────────────────────────────

/** Generate a simple test receipt payload. */
export const generateTestPrintPayload = (businessName: string): Uint8Array => {
  const encoder = new ReceiptPrinterEncoder({ language: 'esc-pos', width: 48 });
  const divider = '='.repeat(48);
  return encoder
    .initialize()
    .align('center')
    .bold(true).size(2, 1).line('TEST PRINT').size(1, 1).bold(false)
    .newline()
    .line(businessName)
    .line(divider)
    .newline()
    .line('Printer connected successfully!')
    .line(`Date: ${new Date().toLocaleString()}`)
    .newline()
    .line(divider)
    .bold(true).line('80mm Thermal Printer Ready').bold(false)
    .newline().newline().newline()
    .cut()
    .encode();
};

/** Generate a full POS sale receipt payload. */
export const generateReceiptPayload = (
  businessName: string,
  cartItems: { quantity: number; productName: string; totalPrice: number }[],
  subtotal: number,
  taxAmount: number,
  total: number,
  paymentMode: string,
  currency: string
): Uint8Array => {
  const encoder = new ReceiptPrinterEncoder({ language: 'esc-pos', width: 48 });

  let receipt = encoder
    .initialize()
    .align('center')
    .bold(true).size(2, 2).line(businessName).bold(false).size(1, 1)
    .newline()
    .line(`Date: ${new Date().toLocaleString()}`)
    .line('Walk-in Customer')
    .newline()
    .align('left')
    .rule({ style: 'single' });

  cartItems.forEach(item => {
    const qtyName = `${item.quantity}x ${item.productName}`;
    const price = item.totalPrice.toFixed(2);
    const spaces = Math.max(1, 48 - qtyName.length - price.length);
    receipt = receipt.line(qtyName + ' '.repeat(spaces) + price);
  });

  receipt = receipt
    .rule({ style: 'single' })
    .align('right')
    .line(`Subtotal: ${subtotal.toFixed(2)}`)
    .line(`Tax:      ${taxAmount.toFixed(2)}`)
    .bold(true).size(1, 2).line(`Total: ${currency} ${total.toFixed(2)}`).bold(false).size(1, 1)
    .newline()
    .align('center')
    .line(`Paid via ${paymentMode.toUpperCase()}`)
    .newline().newline()
    .line('Thank you for your business!')
    .newline().newline().newline()
    .cut();

  return receipt.encode();
};
