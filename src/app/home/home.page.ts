import { Component } from '@angular/core';
//import {BluetoothLeWeb} from "@capacitor-community/bluetooth-le/dist/esm/web";
import { BleClient, ScanResult, BluetoothLe } from '@capacitor-community/bluetooth-le';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {

  devices: { name: string | undefined; id: string, isConnected: Boolean }[] = [];
  isBluetoothEnabled: Boolean = false;
  isScanning: Boolean = false;


  constructor(
      //private BluetoothLeWeb: BluetoothLeWeb
  ) { }
  
  async ngOnInit() {
    await this.requestPermissions();
  }

  async requestPermissions() {
    await BleClient.initialize();
    //await BleClient.req requestLEScan();
  }

  async checkBluetoothStatus() {
    try {
      await this.requestPermissions();
      this.isBluetoothEnabled = await BleClient.isEnabled();
    } catch (error) {
      console.error('Error checkBluetoothStatus:', error);
      alert("Error, we can't check the Bluetooth status, please check the app permissions.");
    }
  }

  async scanDevices() {
    try {
      await this.requestPermissions();
      await this.checkBluetoothStatus();
      this.devices = [];

      if(this.isBluetoothEnabled) {
        this.isScanning = true;
        await BleClient.requestLEScan({}, (result: ScanResult) => {
          if (result.localName && ((result.rssi ?? 0) > -80)) {
            this.checkIfDeviceIsConnected(result.device.deviceId).then(isConnected => {
              this.devices.push({ name: (result.device.name ?? result.localName), id: result.device.deviceId, isConnected: isConnected });
            })
          }
        });
        setTimeout(async () => {
          await BleClient.stopLEScan();
          this.isScanning = false;
        }, 8000);
      } else {
        alert("Bluetooth is disabled.");
      }
    } catch (error) {
      console.error('Error during scan:', error);
    }
  }

  async checkIfDeviceIsConnected(deviceId: string) {
    try {
      const result = await BluetoothLe.getConnectedDevices({ services: []});
      return result.devices.some(device => device.deviceId === deviceId);
    } catch (error) {
      console.error('Error fetching paired devices:', error);
      throw error;
    }
  }

  async connectDevice(deviceId: string) {
    try {
      const isConnected = await this.checkIfDeviceIsConnected(deviceId);
      const result = !isConnected 
      ? (await BluetoothLe.connect({ deviceId }), true) 
      : (await BluetoothLe.disconnect({ deviceId }), false);
      const updatedDevices = this.devices.map(device => device.id == deviceId ? {
        ...device,
        isConnected: result
      } : device)
      this.devices = updatedDevices;
      
    } catch (error) {
      console.error('Error connecting to device:', error);
      alert("Error connecting device: " + error);
    }
  }

  async print(deviceId: string) {
    await this.getDeviceServices(deviceId);
  }

  async getDeviceServices(deviceId: string) {
    try {
      const discoveryResult = await BluetoothLe.getServices({ deviceId });
      console.log('Discovered services and characteristics:', discoveryResult);
      for (const service of discoveryResult.services) {
        console.log(`Service: ${service.uuid}`);
        const validCharacteristic = service.characteristics.find(c => c.properties.write && c.properties.writeWithoutResponse);
        if (validCharacteristic) {
          console.log(`Characteristic: ${validCharacteristic.uuid}`);
          console.log(`Properties: ${JSON.stringify(validCharacteristic.properties)}`);
          this.startPrinter(deviceId, service.uuid, validCharacteristic.uuid);
          break;
        }
      }
    } catch (error) {
      console.error('Error discovering services:', error);
    }
  }

  async startPrinter(deviceId: string, uuid: string, characteristic: string) {
    try {
      const uint8Array = this.stringToUint8Array("   Hello World!");
      const valueToSend = this.uint8ArrayToHex(uint8Array);

      const chunkSize = 1; 
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.subarray(i, i + chunkSize);
        const chunkHex = this.uint8ArrayToHex(chunk);
        console.log(chunkHex);

        await BluetoothLe.write({
          deviceId,
          service: uuid,
          characteristic: characteristic,
          value: chunkHex
        });

      }

    } catch (error) {
      console.error('Error printing:', error);
      alert("Error printing");
    }
  }

  stringToUint8Array(data: string): Uint8Array {
    const encoder = new TextEncoder();
    return encoder.encode(data);
  }

  uint8ArrayToHex(uint8Array: Uint8Array): string {
    return Array.from(uint8Array)
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('');
  }

}
