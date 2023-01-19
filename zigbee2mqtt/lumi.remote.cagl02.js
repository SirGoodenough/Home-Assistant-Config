/**
  # Two Modes
 
  ## Scene Mode
   - rotate
   - shake
   - hold
   - side up
   - trigger after one-min inactivity
 
  ## Action Mode
   - slide
   - rotate
   - tap twice
   - flip90, flip180
   - shake
   - trigger after one-min inactivity

  # Clusters (Scene Mode): 

  ## Endpoint 2: 

  | Cluster            | Data                      | Description                   |
  | ------------------ | ------------------------- | ----------------------------- |
  | aqaraopple         | {329: 0-5}                | i side facing up              |
  | genMultistateInput | {presentValue: 0}         | action: shake                 |
  | genMultistateInput | {presentValue: 4}         | action: hold                  |
  | genMultistateInput | {presentValue: 2}         | action: wakeup                |
  | genMultistateInput | {presentValue: 1024-1029} | action: fall with ith side up |

  ## Endpoint 3: 

  | Cluster   | Data                                  | Desc                                       |
  | --------- | ------------------------------------- | ------------------------------------------ |
  | genAnalog | {267: 500, 329: 3, presentValue: -51} | 267: NA, 329: side up, presentValue: angle |
  
   
 */

  const fz = require('zigbee-herdsman-converters/converters/fromZigbee');
  const exposes = require('zigbee-herdsman-converters/lib/exposes');
  const xiaomi = require('zigbee-herdsman-converters/lib/xiaomi');
  const e = exposes.presets;
  const ea = exposes.access;
  
  const OPS_MODE = {
    ACTION: 0,
    SCENE: 1,
  };
  const ops_mode_lookup = { 0: 'action mode', 1: 'scene mode' };
  
  const aqara_opple = {
    cluster: 'aqaraOpple',
    type: ['attributeReport', 'readResponse'],
    options: (definition) => [
      ...xiaomi.numericAttributes2Options(definition),
      exposes.enum('operation_mode', ea.STATE, ['scene mode', 'action mode']),
    ],
    convert: (model, msg, publish, options, meta) => {
      // console.log('>>>> ops mode', meta.state.operationMode);
      if (msg.data.hasOwnProperty('155') || msg.data.hasOwnProperty('328')) {
        const ops_mode = msg.data['155'] || msg.data['328'];
        meta.state.operationMode = ops_mode;
      }
  
      const operation_mode = ops_mode_lookup[meta.state.operationMode];
  
      return {
        ...xiaomi.numericAttributes2Payload(msg, meta, model, options, msg.data),
        operation_mode,
        action: 'side_up',
        side_up: msg.data['329'],
      };
    },
  };
  
  const action_multistate = {
    ...fz.MFKZQ01LM_action_multistate,
    convert: (model, msg, publish, options, meta) => {
      if (meta.state.operationMode === OPS_MODE.ACTION) {
        return fz.MFKZQ01LM_action_multistate.convert(
          model,
          msg,
          publish,
          options,
          meta
        );
      } else {
        const value = msg.data['presentValue'];
        let scene_action_multistate;
        if (value === 0) scene_action_multistate = { action: 'shake' };
        else if (value === 2) scene_action_multistate = { action: 'wakeup' };
        else if (value === 4) scene_action_multistate = { action: 'hold' };
        else if (value >= 1024)
          scene_action_multistate = { action: 'side_up', side_up: value - 1024 };
  
        return scene_action_multistate;
      }
    },
  };
  
  const definition = {
    zigbeeModel: ['lumi.remote.cagl02'],
    model: 'CTP-R01',
    vendor: 'Lumi',
    description: 'Aqara cube T1 Pro',
    meta: { battery: { voltageToPercentage: '3V_2850_3000' } },
    fromZigbee: [aqara_opple, action_multistate, fz.MFKZQ01LM_action_analog],
    toZigbee: [],
    exposes: [
      /* Device Info */
      e.battery(),
      e.battery_voltage(),
      e.device_temperature(),
      e.power_outage_count(false),
      exposes
        .enum('operation_mode', ea.STATE, ['scene mode', 'action mode'])
        .withDescription(
          'Press LINK button 5 times to toggle between action mode and scene mode'
        ),
      /* Actions */
      e.angle('action_angle'),
      e.cube_side('action_from_side'),
      e.cube_side('action_side'),
      e.cube_side('action_to_side'),
      e.cube_side('side').withDescription('Destination side of action'),
      e.cube_side('side_up').withDescription('Upfacing side of current scene'),
      e.action([
        'shake',
        'wakeup',
        'fall',
        'tap',
        'slide',
        'flip180',
        'flip90',
        'hold',
        'side_up',
        'rotate_left',
        'rotate_right',
      ]),
    ],
  };
  
  module.exports = definition;