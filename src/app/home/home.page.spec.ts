import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { HomePage } from './home.page';

describe('HomePage', () => {
  let component: HomePage;
  let fixture: ComponentFixture<HomePage>;

  const mockBleClient = {
    isEnabled: jasmine.createSpy('isEnabled'),
    requestLEScan: jasmine.createSpy('requestLEScan'),
    stopLEScan: jasmine.createSpy('stopLEScan'),
  };

  const mockBluetoothLe = {
    getConnectedDevices: jasmine.createSpy('getConnectedDevices'),
    connect: jasmine.createSpy('connect'),
    disconnect: jasmine.createSpy('disconnect'),
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        HomePage,
        { provide: 'BleClient', useValue: mockBleClient },
        { provide: 'BluetoothLe', useValue: mockBluetoothLe },
        { provide: 'BluetoothLeWeb', useValue: {} },
      ],
    });
    component = TestBed.inject(HomePage);
    spyOn(component, 'requestPermissions').and.returnValue(Promise.resolve());
  });

  
  describe('scanDevices', () => {
    it('should scan for devices when Bluetooth is enabled', async () => {
      mockBleClient.isEnabled.and.returnValue(Promise.resolve(true));
      mockBleClient.requestLEScan.and.callFake((_, callback) => {
        callback({
          localName: 'Dummy Device',
          rssi: -70,
          device: { deviceId: '123', name: 'Test Device' },
        });
        return Promise.resolve();
      });
      spyOn(component, 'checkIfDeviceIsConnected').and.returnValue(Promise.resolve(false));
      await component.scanDevices();
      expect(component.devices.length).toBe(1);
      expect(component.devices[0].name).toBe('Dummy Device');
      expect(mockBleClient.requestLEScan).toHaveBeenCalled();
    });

    it('should not scan if Bluetooth is disabled', async () => {
      mockBleClient.isEnabled.and.returnValue(Promise.resolve(false));
      spyOn(window, 'alert');
      await component.scanDevices();
      expect(window.alert).toHaveBeenCalledWith('Bluetooth is disabled.');
      expect(component.devices.length).toBe(0);
    });
  });

  describe('checkIfDeviceIsConnected', () => {
    it('should return true if the device is connected', async () => {
      mockBluetoothLe.getConnectedDevices.and.returnValue(
        Promise.resolve({ devices: [{ deviceId: '123' }] })
      );
      const result = await component.checkIfDeviceIsConnected('123');
      expect(result).toBeTrue();
    });

    it('should return false if the device is not connected', async () => {
      mockBluetoothLe.getConnectedDevices.and.returnValue(Promise.resolve({ devices: [] }));
      const result = await component.checkIfDeviceIsConnected('123');
      expect(result).toBeFalse();
    });

    it('should handle errors', async () => {
      mockBluetoothLe.getConnectedDevices.and.throwError('Connection error');
      await expectAsync(component.checkIfDeviceIsConnected('123')).toBeRejectedWithError(
        'Connection error'
      );
    });
  });

  describe('connectDevice', () => {
    it('should connect to the device if not connected', async () => {
      spyOn(component, 'checkIfDeviceIsConnected').and.returnValue(Promise.resolve(false));
      mockBluetoothLe.connect.and.returnValue(Promise.resolve());
      await component.connectDevice('123');
      expect(mockBluetoothLe.connect).toHaveBeenCalledWith({ deviceId: '123' });
    });

    it('should disconnect the device if already connected', async () => {
      spyOn(component, 'checkIfDeviceIsConnected').and.returnValue(Promise.resolve(true));
      mockBluetoothLe.disconnect.and.returnValue(Promise.resolve());
      await component.connectDevice('123');
      expect(mockBluetoothLe.disconnect).toHaveBeenCalledWith({ deviceId: '123' });
    });

    it('should handle connection errors', async () => {
      spyOn(component, 'checkIfDeviceIsConnected').and.returnValue(Promise.resolve(false));
      mockBluetoothLe.connect.and.throwError('Connection error');
      spyOn(window, 'alert');
      await component.connectDevice('123');
      expect(window.alert).toHaveBeenCalledWith('Error connecting device: Connection error');
    });
  });

});
