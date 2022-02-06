
sensors = [
    "BatteryLowMailbox",
    "BatteryLowBedroom",
    "BatteryLowGarageC",
    "BatteryLowSideDoorI",
    "BatteryLowBathroom",
    "BatteryLowGarageSide",
    "BatteryLowFrontDoorI",
    "BatteryLowGarageO",
    "BatteryLowBackDoorI"
    "BasementSmoke"
    ]
for x in sensors:
    service_data = {'topic':'rf433/{}'.format(x), 'payload':'OFF', 'qos':1, 'retain':'true'}
    hass.services.call('mqtt', 'publish', service_data, False)
