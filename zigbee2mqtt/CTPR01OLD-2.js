/**
 * Author: Lu Ji (https://github.com/jjpro)
 */
 const fz = require('zigbee-herdsman-converters/converters/fromZigbee');
 const exposes = require('zigbee-herdsman-converters/lib/exposes');
 const xiaomi = require('zigbee-herdsman-converters/lib/xiaomi');
 const herdsman = require('zigbee-herdsman');
 const globalStore = require('zigbee-herdsman-converters/lib/store');
 const ota = require('zigbee-herdsman-converters/lib/ota');
 
 const e = exposes.presets;
 const ea = exposes.access;
 
 const manufacturerOptions = {
   xiaomi: {
     manufacturerCode: herdsman.Zcl.ManufacturerCode.LUMI_UNITED_TECH,
     disableDefaultResponse: true,
   },
 };
 
 const OP_MODE_ATTR = 0x0148;
 const opModeLookup = { 0: 'action_mode', 1: 'scene_mode' };
 const opModeReverseLookup = { action_mode: 0, scene_mode: 1 };
 
 
 const aqara_opple = {
   ...fz.aqara_opple,
   convert: async (model, msg, publish, options, meta) => {
     const payload = xiaomi.numericAttributes2Payload(msg, meta, model, options, msg.data);
 
     // basic data reading (contains operation_mode at attribute 0xf7[247].0x9b[155])
     if (msg.data.hasOwnProperty(247)) {
       // execute pending soft switch of operation_mode, if exists
       const opModeSwitchTask = globalStore.getValue(meta.device, 'opModeSwitchTask');
       if (opModeSwitchTask) {
         const { callback, newMode } = opModeSwitchTask;
         await callback();
         payload.operation_mode = newMode;
         globalStore.putValue(meta.device, 'opModeSwitchTask', null);
       } else {
         const dataObject247 = xiaomi.buffer2DataObject(
           meta,
           model,
           msg.data[247]
         );
         payload.operation_mode = opModeLookup[dataObject247[155]];
       }
     }
     // detected hard switch of operation_mode (attribute 0x148[328])
     else if (msg.data.hasOwnProperty(328)) {
       payload.operation_mode = opModeLookup[msg.data[328]];
     }
     // side_up attribute report (attribute 0x149[329])
     else if (msg.data.hasOwnProperty(329)) {
       payload.action = 'side_up';
       payload.side = msg.data[329] + 1;
     }
 
     return payload;
   },
 };
 
 const action_multistate = {
   cluster: 'genMultistateInput',
   type: ['attributeReport', 'readResponse'],
   options: [],
   convert: (model, msg, publish, options, meta) => {
     const value = msg.data['presentValue'];
     let payload;
 
     if (value === 0) payload = { action: 'shake' };
     else if (value === 1) payload = { action: 'throw' };
     else if (value === 2) payload = { action: '1_min_inactivity' };
     else if (value === 4) payload = { action: 'hold' };
     else if (value >= 1024) payload = { action: 'flip_to_side', side: value - 1023 };
     else if (value >= 512) payload = { action: 'tap', side: value - 511 };
     else if (value >= 256) payload = { action: 'slide', side: value - 255 };
     else if (value >= 128) {
       payload = {
         action: 'flip180', side: value - 127,
         action_from_side: 7 - value + 127
       };
     } else if (value >= 64) {
       payload = {
         action: 'flip90', side: value % 8 + 1,
         action_from_side: Math.floor((value - 64) / 8) + 1
       };
     } else {
       meta.logger.debug(`${model.zigbeeModel}: unknown action with value ${value}`);
     }
     return payload;
   }
 
 };
 
 const action_analog = {
   cluster: 'genAnalogInput',
   type: ['attributeReport', 'readResponse'],
   options: [],
   convert: (model, msg, publish, options, meta) => {
     const value = msg.data['presentValue'];
     return {
       action: value < 0 ? 'rotate_left' : 'rotate_right',
       action_angle: Math.floor(value * 100) / 100,
     };
   },
 }
 
 const operation_mode_switch = {
   key: ['operation_mode'],
   convertSet: async (entity, key, value, meta) => {
     /**
      * schedule the callback to run when the configuration window comes
      */
     const callback = async () => {
       await entity.write(
         'aqaraOpple',
         {
           [OP_MODE_ATTR]: {
             value: opModeReverseLookup[value],
             type: 0x20,
           },
         },
         manufacturerOptions.xiaomi
       );
       meta.logger.info("operation_mode switch success!");
     };
 
     meta.logger.info('Now give your cube a forceful throw motion (Careful not to drop it)!');
 
     // store callback
     globalStore.putValue(meta.device, 'opModeSwitchTask', { callback, newMode: value });
   },
 };
 
 const definition = {
   zigbeeModel: ['lumi.remote.cagl02'],
   model: 'CTP-R01',
   vendor: 'Xiaomi',
   description: 'Aqara magic cube T1 Pro',
   meta: { battery: { voltageToPercentage: '3V_2850_3000' } },
   ota: ota.zigbeeOTA,
   fromZigbee: [aqara_opple, action_multistate, action_analog, fz.ignore_onoff_report],
   toZigbee: [operation_mode_switch],
   exposes: [
     e.battery(),
     e.battery_voltage(),
     e.device_temperature(),
     e.power_outage_count(false),
     exposes
       .enum('operation_mode', ea.SET, ['action_mode', 'scene_mode'])
       .withDescription('[Soft Switch]: There is a configuration window, opens once an hour on itself, ' +
         'only during which the cube will respond to mode switch. ' +
         'Mode switch will be scheduled to take effect when the window becomes available. ' +
         'You can also give it a throw action (no backward motion) to force a respond! ' +
         'Otherwise, you may open lid and click LINK once to make the cube respond immediately. ' +
         '[Hard Switch]: Open lid and click LINK button 5 times.'),
     e.cube_side('side'),
     e.action([
       'shake',
       'throw',
       'tap',
       'slide',
       'flip180',
       'flip90',
       'hold',
       'side_up',
       'rotate_left',
       'rotate_right',
       '1_min_inactivity',
       'flip_to_side',
     ]).withDescription('Triggered action'),
     e.cube_side('action_from_side'),
     e.angle('action_angle'),
   ],
   configure: async (device, coordinatorEndpoint, logger) => {
     device.softwareBuildID = `0.0.0_00${device.applicationVersion}`;
     device.save();
 
     const endpoint = device.getEndpoint(1);
     await endpoint.write('aqaraOpple', { mode: 1 }, { ...manufacturerOptions.xiaomi, disableResponse: true }); // attr: 0x0009
     await endpoint.write('aqaraOpple',
       {
         0x00ff: {
           value: [0x45, 0x65, 0x21, 0x20, 0x75, 0x38, 0x17, 0x69, 0x78,
             0x53, 0x89, 0x51, 0x13, 0x16, 0x49, 0x58],
           type: 0x41
         }
       }
       , { ...manufacturerOptions.xiaomi, disableResponse: true });
     setTimeout(() => logger.info(`${device.ieeeAddr} battery info takes time to load for the first time. ` +
       'You may give device a throw motion to speed up the process.'), 3000);
   },
 };
 
 module.exports = definition;
 